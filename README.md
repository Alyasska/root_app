# Буклеты персонажей Root RPG

Полноценный React-сайт (Vite + Tailwind) с автодеплоем на GitHub Pages.

## Локальный запуск

1. Откройте терминал в этой папке проекта.
2. Установите зависимости:

   npm install

3. Запустите сайт:

   npm run dev

4. Откройте адрес из терминала (обычно http://localhost:5173).

## Сборка

npm run build

Готовые статические файлы будут в папке `dist`.

## Автодеплой на GitHub Pages

В проект уже добавлен workflow:

- `.github/workflows/deploy-pages.yml`

Что нужно сделать в GitHub:

1. Запушить проект в ветку `main`.
2. В репозитории открыть Settings -> Pages.
3. В Source выбрать GitHub Actions.
4. После пуша workflow автоматически соберет сайт и выложит его.

Ссылка на сайт появится:

- в разделе Actions после успешного workflow
- и в Settings -> Pages

## Структура

- `src/App.jsx` — основной интерфейс с данными буклетов
- `src/index.css` — Tailwind + шрифты + базовый визуальный стиль
- `vite.config.js` — сборка Vite с `base: "./"` для корректной работы на Pages
