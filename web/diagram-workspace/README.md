# Diagram Workspace

Это веб-интерфейс для отображения UML диаграмм Apex классов.

## Структура

- `index.html` - HTML шаблон для webview
- `index.js` - логика управления диаграммой (исходный файл)
- `bundle.js` - собранный bundle (генерируется webpack, находится в `dist/webview/`)

## Библиотеки

### UML Diagram (@alesik/uml-diagram)

Библиотека для отрисовки UML диаграмм, установленная через npm.

**Важно:** Библиотека импортируется в `index.js` и включается в bundle при сборке webpack.

Для обновления библиотеки:
1. Обновите версию: `npm update @alesik/uml-diagram`
2. Запустите компиляцию: `npm run compile`

## Как это работает

1. **Сборка webview** (`npm run compile`):
   - Запускается webpack с конфигурацией `webpack.webview.config.js`
   - Webpack берет `index.js` как entry point
   - Импортирует `@alesik/uml-diagram` из node_modules
   - Собирает все в один файл `dist/webview/bundle.js` (~373KB)

2. **Загрузка в VS Code**:
   - `DiagramWorkspaceProvider.ts` читает `index.html`
   - Заменяет `./bundle.js` на webview URI
   - VS Code webview загружает собранный bundle

## Команды

- `npm run build:webview` - собрать webview bundle
- `npm run watch:webview` - watch режим для webview (пересборка при изменениях)
- `npm run compile` - полная компиляция (webview + TypeScript)

## Преимущества webpack подхода

✅ Стандартный подход для VS Code расширений
✅ Автоматическое разрешение зависимостей
✅ Минификация и оптимизация
✅ Один bundle файл вместо множества
✅ Tree shaking (удаление неиспользуемого кода)
✅ Source maps для отладки
