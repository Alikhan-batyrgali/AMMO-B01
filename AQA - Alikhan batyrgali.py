# Импорт необходимых библиотек
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

def load_and_preprocess_data(file_path: str):
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Ошибка: Файл '{file_path}' не найден.")
        return None
    
    if 'A_id' in df.columns:
        df = df.drop(columns=['A_id'])

    df.replace(['-'], np.nan, inplace=True)
    
    numeric_features = ['Size', 'Weight', 'Sweetness', 'Crunchiness', 'Juiciness', 'Acidity']
    for col in numeric_features:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    df[numeric_features] = df[numeric_features].fillna(df[numeric_features].mean())

    ripeness_mapping = {'green': 1, 'medium': 2, 'ripe': 3}
    df['Ripeness'] = df['Ripeness'].map(ripeness_mapping)

    ripeness_mode = df['Ripeness'].mode()
    if not ripeness_mode.empty:
        df['Ripeness'] = df['Ripeness'].fillna(ripeness_mode[0])
    else:
        df['Ripeness'] = df['Ripeness'].fillna(2)

    quality_mapping = {'good': 1, 'bad': 0}
    df['Quality'] = df['Quality'].map(quality_mapping)

    df.dropna(subset=['Quality'], inplace=True)
    
    return df

def train_and_evaluate_model(model, X_train, y_train, X_test, y_test):
    """
    Обучает и возвращает предсказания и метрики модели.
    """
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, predictions)
    conf_matrix = confusion_matrix(y_test, predictions)
    class_report = classification_report(y_test, predictions, output_dict=True)
    
    return predictions, accuracy, conf_matrix, class_report

def visualize_confusion_matrix(y_true, y_pred, title, class_names=['Хорошее', 'Плохое']):
    """
    Визуализирует матрицу ошибок с процентами.
    """
    cm = confusion_matrix(y_true, y_pred)
    cm_percent = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]

    plt.figure(figsize=(8, 6))
    sns.heatmap(cm_percent, annot=True, fmt='.2%', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names, cbar=False)
    plt.title(f'Матрица ошибок для {title} (%)')
    plt.xlabel('Предсказано')
    plt.ylabel('Истинное значение')
    plt.show()

def main():
    """
    Основная функция для выполнения всех шагов.
    """
    # Шаг 1: Загрузка и предобработка данных
    data = load_and_preprocess_data('apple_quality.csv')
    if data is None or data.empty:
        print("Датасет пуст после предобработки.")
        return

    # Шаг 2: Разделение данных
    X = data.drop(columns=['Quality'])
    y = data['Quality']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Шаг 3: Создание пайплайна для предобработки
    numeric_features = ['Size', 'Weight', 'Sweetness', 'Crunchiness', 'Juiciness', 'Acidity', 'Ripeness']
    preprocessor = ColumnTransformer(
        transformers=[('scaler', StandardScaler(), numeric_features)],
        remainder='passthrough'
    )
    
    # Шаг 4: Обучение и оценка моделей
    log_reg_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                       ('classifier', LogisticRegression(random_state=42))])
    
    rf_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                  ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))])
    
    # Оценка Логистической регрессии
    log_reg_preds, log_reg_acc, log_reg_cm, log_reg_report = train_and_evaluate_model(
        log_reg_pipeline, X_train, y_train, X_test, y_test
    )
    
    # Оценка Случайного леса
    rf_preds, rf_acc, rf_cm, rf_report = train_and_evaluate_model(
        rf_pipeline, X_train, y_train, X_test, y_test
    )

    # Шаг 5: Сравнительный анализ и визуализация
    print("\n" + "="*50)
    print("           Сравнительный анализ моделей          ")
    print("="*50)
    
    # Создаем DataFrame для удобного сравнения
    comparison_df = pd.DataFrame({
        'Метрика': ['Точность', 'Точность (Плохое)', 'Полнота (Плохое)', 'F1-мера (Плохое)',
                     'Точность (Хорошее)', 'Полнота (Хорошее)', 'F1-мера (Хорошее)'],
        'Логистическая регрессия': [
            f'{log_reg_acc:.4f}',
            f'{log_reg_report["0"]["precision"]:.4f}',
            f'{log_reg_report["0"]["recall"]:.4f}',
            f'{log_reg_report["0"]["f1-score"]:.4f}',
            f'{log_reg_report["1"]["precision"]:.4f}',
            f'{log_reg_report["1"]["recall"]:.4f}',
            f'{log_reg_report["1"]["f1-score"]:.4f}'
        ],
        'Случайный лес': [
            f'{rf_acc:.4f}',
            f'{rf_report["0"]["precision"]:.4f}',
            f'{rf_report["0"]["recall"]:.4f}',
            f'{rf_report["0"]["f1-score"]:.4f}',
            f'{rf_report["1"]["precision"]:.4f}',
            f'{rf_report["1"]["recall"]:.4f}',
            f'{rf_report["1"]["f1-score"]:.4f}'
        ]
    })
    
    print(comparison_df.to_string(index=False))
    
    print("\n" + "="*50)
    print("           Визуализация матриц ошибок          ")
    print("="*50)
    
    # Визуализация для обеих моделей
    visualize_confusion_matrix(y_test, log_reg_preds, "Логистической регрессии")
    visualize_confusion_matrix(y_test, rf_preds, "Случайного леса")

if __name__ == "__main__":
    main()