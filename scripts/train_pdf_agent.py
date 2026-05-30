from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pdf_agent.text_tools import feature_text  # noqa: E402


DEFAULT_DATASET = ROOT / "pdf_agent" / "data" / "training_lines.jsonl"
DEFAULT_MODEL = ROOT / "pdf_agent" / "model" / "pdf_line_classifier.joblib"


def read_dataset(path: Path) -> tuple[list[str], list[str], list[str]]:
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    x = [feature_text(row) for row in rows]
    y = [row["label"] for row in rows]
    groups = [row.get("sourceId") or f"row_{index}" for index, row in enumerate(rows)]
    return x, y, groups


def make_model(max_features: int = 35000, max_iter: int = 120) -> Pipeline:
    return Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 3),
                    min_df=1,
                    max_features=max_features,
                    token_pattern=r"(?u)\b[\w_]+\b|[()+\-*/=<>]",
                ),
            ),
            (
                "classifier",
                MLPClassifier(
                    hidden_layer_sizes=(96, 48),
                    activation="relu",
                    solver="adam",
                    alpha=0.0005,
                    batch_size=128,
                    learning_rate_init=0.001,
                    early_stopping=False,
                    n_iter_no_change=12,
                    max_iter=max_iter,
                    random_state=42,
                ),
            ),
        ]
    )


def train(dataset: Path, model_path: Path, cv_folds: int = 5, max_features: int = 35000, max_iter: int = 120) -> dict:
    x, y, groups = read_dataset(dataset)
    if len(x) < 20:
        raise RuntimeError("Zbior treningowy jest za maly. Uruchom najpierw scripts/build_pdf_training_set.py.")

    cv_report_text = ""
    if cv_folds and cv_folds >= 2:
        folds = min(cv_folds, len(set(groups)))
        if folds >= 2:
            cv = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=42)
            cv_predictions = cross_val_predict(make_model(max_features, max_iter), x, y, groups=groups, cv=cv, n_jobs=1)
            cv_report_text = classification_report(y, cv_predictions, zero_division=0)

    stratify = y if len(set(y)) > 1 and min(y.count(label) for label in set(y)) >= 2 else None
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.25,
        random_state=42,
        stratify=stratify,
    )

    model = make_model(max_features, max_iter)
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    report_text = classification_report(y_test, predictions, zero_division=0)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)

    metrics = {
        "dataset": str(dataset),
        "model": str(model_path),
        "records": len(x),
        "groups": len(set(groups)),
        "trainRecords": len(x_train),
        "testRecords": len(x_test),
        "labels": sorted(set(y)),
        "modelType": "tfidf_mlp_neural_network",
        "hiddenLayers": [96, 48],
        "maxFeatures": max_features,
        "maxIter": max_iter,
        "crossValidationFolds": cv_folds,
        "crossValidationReport": cv_report_text,
        "classificationReport": report_text,
    }
    (model_path.parent / "training_metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the local PDF line classifier.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--cv-folds", type=int, default=5)
    parser.add_argument("--max-features", type=int, default=35000)
    parser.add_argument("--max-iter", type=int, default=120)
    args = parser.parse_args()

    metrics = train(args.dataset, args.model, args.cv_folds, args.max_features, args.max_iter)
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
