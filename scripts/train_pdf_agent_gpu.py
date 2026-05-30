from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedGroupKFold, train_test_split
from torch import nn
from torch.utils.data import DataLoader, Dataset

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pdf_agent.text_tools import feature_text  # noqa: E402


DEFAULT_DATASET = ROOT / "pdf_agent" / "data" / "training_lines.jsonl"
DEFAULT_OUTPUT_DIR = ROOT / "pdf_agent" / "model" / "gpu"
LABELS = ["answer_area", "noise", "task_body", "task_header"]


@dataclass
class TrainingRows:
    x: list[str]
    y: np.ndarray
    groups: np.ndarray


class SparseRows(Dataset):
    def __init__(self, matrix, labels: np.ndarray):
        self.matrix = matrix
        self.labels = labels

    def __len__(self) -> int:
        return int(self.labels.shape[0])

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.matrix[index].toarray().astype(np.float32, copy=False).ravel()
        return torch.from_numpy(row), torch.tensor(int(self.labels[index]), dtype=torch.long)


class LineClassifier(nn.Module):
    def __init__(self, feature_count: int, hidden_sizes: tuple[int, int], class_count: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(feature_count, hidden_sizes[0]),
            nn.ReLU(),
            nn.Dropout(0.12),
            nn.Linear(hidden_sizes[0], hidden_sizes[1]),
            nn.ReLU(),
            nn.Dropout(0.08),
            nn.Linear(hidden_sizes[1], class_count),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def read_dataset(path: Path) -> TrainingRows:
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    label_to_id = {label: index for index, label in enumerate(LABELS)}
    x = [feature_text(row) for row in rows]
    y = np.array([label_to_id[row["label"]] for row in rows], dtype=np.int64)
    groups = np.array([row.get("sourceId") or f"row_{index}" for index, row in enumerate(rows)])
    return TrainingRows(x=x, y=y, groups=groups)


def make_vectorizer(max_features: int) -> TfidfVectorizer:
    return TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 3),
        min_df=1,
        max_features=max_features,
        token_pattern=r"(?u)\b[\w_]+\b|[()+\-*/=<>]",
        dtype=np.float32,
    )


def resolve_device(requested: str, require_cuda: bool) -> torch.device:
    if requested == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(requested)
    if require_cuda and device.type != "cuda":
        raise RuntimeError("CUDA is required but torch.cuda.is_available() is false.")
    if device.type == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA device requested but torch.cuda.is_available() is false.")
    return device


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def train_one(
    train_matrix,
    train_y: np.ndarray,
    valid_matrix,
    valid_y: np.ndarray,
    device: torch.device,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    hidden_sizes: tuple[int, int],
) -> tuple[LineClassifier, list[int]]:
    model = LineClassifier(train_matrix.shape[1], hidden_sizes, len(LABELS)).to(device)
    loader = DataLoader(
        SparseRows(train_matrix, train_y),
        batch_size=batch_size,
        shuffle=True,
        pin_memory=device.type == "cuda",
    )
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=0.0005)
    loss_fn = nn.CrossEntropyLoss()

    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for batch_x, batch_y in loader:
            batch_x = batch_x.to(device, non_blocking=True)
            batch_y = batch_y.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            loss = loss_fn(model(batch_x), batch_y)
            loss.backward()
            optimizer.step()
            total_loss += float(loss.detach().cpu()) * int(batch_y.shape[0])
        print(f"epoch={epoch:03d} loss={total_loss / max(1, len(train_y)):.6f}")

    return model, predict(model, valid_matrix, device, batch_size)


def predict(model: LineClassifier, matrix, device: torch.device, batch_size: int) -> list[int]:
    loader = DataLoader(
        SparseRows(matrix, np.zeros(matrix.shape[0], dtype=np.int64)),
        batch_size=batch_size,
        shuffle=False,
        pin_memory=device.type == "cuda",
    )
    predictions: list[int] = []
    model.eval()
    with torch.no_grad():
        for batch_x, _ in loader:
            logits = model(batch_x.to(device, non_blocking=True))
            predictions.extend(logits.argmax(dim=1).detach().cpu().tolist())
    return predictions


def report(y_true: np.ndarray, y_pred: list[int]) -> str:
    return classification_report(
        y_true,
        y_pred,
        labels=list(range(len(LABELS))),
        target_names=LABELS,
        zero_division=0,
    )


def cross_validate(
    rows: TrainingRows,
    folds: int,
    device: torch.device,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    max_features: int,
    hidden_sizes: tuple[int, int],
) -> str:
    if folds < 2:
        return ""
    cv = StratifiedGroupKFold(n_splits=min(folds, len(set(rows.groups))), shuffle=True, random_state=42)
    y_true: list[int] = []
    y_pred: list[int] = []
    for fold, (train_index, valid_index) in enumerate(cv.split(rows.x, rows.y, rows.groups), start=1):
        print(f"cross_validation_fold={fold}")
        vectorizer = make_vectorizer(max_features)
        train_matrix = vectorizer.fit_transform([rows.x[index] for index in train_index])
        valid_matrix = vectorizer.transform([rows.x[index] for index in valid_index])
        _, fold_pred = train_one(
            train_matrix,
            rows.y[train_index],
            valid_matrix,
            rows.y[valid_index],
            device,
            epochs,
            batch_size,
            learning_rate,
            hidden_sizes,
        )
        y_true.extend(rows.y[valid_index].tolist())
        y_pred.extend(fold_pred)
    return report(np.array(y_true, dtype=np.int64), y_pred)


def save_artifacts(
    output_dir: Path,
    model: LineClassifier,
    vectorizer: TfidfVectorizer,
    metrics: dict,
    hidden_sizes: tuple[int, int],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "stateDict": model.state_dict(),
            "labels": LABELS,
            "featureCount": len(vectorizer.get_feature_names_out()),
            "hiddenSizes": list(hidden_sizes),
        },
        output_dir / "pdf_line_classifier_gpu.pt",
    )
    joblib.dump(vectorizer, output_dir / "pdf_line_vectorizer.joblib")
    (output_dir / "training_metrics_gpu.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")


def train(args: argparse.Namespace) -> dict:
    seed_everything(args.seed)
    device = resolve_device(args.device, args.require_cuda)
    rows = read_dataset(args.dataset)
    print(f"device={device.type} records={len(rows.x)} groups={len(set(rows.groups))}")

    cv_report = cross_validate(
        rows,
        args.cv_folds,
        device,
        args.epochs,
        args.batch_size,
        args.learning_rate,
        args.max_features,
        (args.hidden_1, args.hidden_2),
    )

    train_index, test_index = train_test_split(
        np.arange(len(rows.x)),
        test_size=args.test_size,
        random_state=args.seed,
        stratify=rows.y,
    )
    vectorizer = make_vectorizer(args.max_features)
    train_matrix = vectorizer.fit_transform([rows.x[index] for index in train_index])
    test_matrix = vectorizer.transform([rows.x[index] for index in test_index])
    model, test_pred = train_one(
        train_matrix,
        rows.y[train_index],
        test_matrix,
        rows.y[test_index],
        device,
        args.epochs,
        args.batch_size,
        args.learning_rate,
        (args.hidden_1, args.hidden_2),
    )
    test_report = report(rows.y[test_index], test_pred)
    metrics = {
        "dataset": str(args.dataset),
        "outputDir": str(args.output_dir),
        "records": len(rows.x),
        "groups": len(set(rows.groups)),
        "device": str(device),
        "cudaAvailable": torch.cuda.is_available(),
        "epochs": args.epochs,
        "batchSize": args.batch_size,
        "learningRate": args.learning_rate,
        "maxFeatures": args.max_features,
        "hiddenSizes": [args.hidden_1, args.hidden_2],
        "crossValidationFolds": args.cv_folds,
        "crossValidationReport": cv_report,
        "classificationReport": test_report,
    }
    save_artifacts(args.output_dir, model, vectorizer, metrics, (args.hidden_1, args.hidden_2))
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the PDF line classifier with a Torch MLP on GPU.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--device", default="auto", help="auto, cuda, cuda:0, or cpu")
    parser.add_argument("--require-cuda", action="store_true", help="Fail instead of falling back to CPU.")
    parser.add_argument("--cv-folds", type=int, default=5)
    parser.add_argument("--epochs", type=int, default=24)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--learning-rate", type=float, default=0.001)
    parser.add_argument("--max-features", type=int, default=12000)
    parser.add_argument("--hidden-1", type=int, default=96)
    parser.add_argument("--hidden-2", type=int, default=48)
    parser.add_argument("--test-size", type=float, default=0.25)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(train(args), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
