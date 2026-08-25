import { ConversionCategory } from '../types/converter';

export interface SeoConversionRoute {
  slug: string; // e.g. "heic-to-jpg"
  fromFormat: string; // e.g. "HEIC"
  toFormat: string; // e.g. "JPG"
  category: ConversionCategory;
  title: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  descriptionParagraphs: string[];
  steps: { step: number; title: string; text: string }[];
  features: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  translations?: Record<string, Partial<Omit<SeoConversionRoute, 'slug' | 'fromFormat' | 'toFormat' | 'category' | 'translations'>>>;
}

export const POPULAR_SEO_ROUTES: Record<string, SeoConversionRoute> = {
  'heic-to-jpg': {
    slug: 'heic-to-jpg',
    fromFormat: 'HEIC',
    toFormat: 'JPG',
    category: 'image',
    title: 'Конвертер HEIC в JPG онлайн — быстро и бесплатно | AllConvert',
    metaDescription: 'Бесплатный онлайн конвертер HEIC в JPG. Преобразуйте фото с iPhone и iPad в формат JPG прямо в браузере без потери качества и загрузки на сервер.',
    h1: 'Бесплатный онлайн конвертер HEIC в JPG',
    subtitle: 'Мгновенное декодирование фотографий Apple iOS в качественные файлы JPG без отправки на сервер',
    descriptionParagraphs: [
      'Формат HEIC (High Efficiency Image Container) используется по умолчанию на устройствах Apple iPhone и iPad для экономии места. Однако многие операционные системы, Windows, веб-сайты и старые программы не могут открывать файлы HEIC.',
      'AllConvert позволяет сгенерировать классический файл JPG прямо на вашем устройстве с помощью технологий WebAssembly. Ваши личные фотографии не передаются на сторонние серверы, что гарантирует 100% конфиденциальность и молниеносную скорость.'
    ],
    steps: [
      { step: 1, title: 'Выберите файлы HEIC / HEIF', text: 'Перетащите ваши снимки с iPhone в область загрузки или нажмите кнопку выбор файлов.' },
      { step: 2, title: 'Настройте качество (опционально)', text: 'Укажите желаемый уровень сжатия в настройках или оставьте 100% максимальное качество.' },
      { step: 3, title: 'Скачайте готовые JPG', text: 'Запустите процесс и мгновенно сохраните готовые изображения JPG по отдельности или единым ZIP-архивом.' }
    ],
    features: [
      { title: '🔒 Полная приватность', text: 'Декодирование происходит локально в вашем браузере. Файлы не покидают ваше устройство.' },
      { title: '⚡ Быстрое пакетное сжатие', text: 'Конвертируйте десятки фотографий одновременно без ограничений на размер или количество.' },
      { title: '🌈 Сохранение цветов', text: 'Сохраняем максимальную детализацию и точную цветопередачу исходных кадров.' }
    ],
    faqs: [
      { q: 'Почему файлы с iPhone сохраняются в HEIC?', a: 'Apple использует формат HEIC, так как он обеспечивает вдвое меньший размер файла при сохранении высокого качества по сравнению с устаревшим JPG.' },
      { q: 'Безопасно ли конвертировать личные снимки в AllConvert?', a: 'Абсолютно! Обработка HEIC выполняется локально в вашем браузере с помощью WebAssembly, файлы не загружаются ни на какие серверы.' },
      { q: 'Можно ли конвертировать несколько HEIC файлов сразу?', a: 'Да, AllConvert поддерживает пакетную загрузку и конвертацию неограниченного числа файлов с последующей выгрузкой в ZIP.' }
    ]
  },
  'png-to-jpg': {
    slug: 'png-to-jpg',
    fromFormat: 'PNG',
    toFormat: 'JPG',
    category: 'image',
    title: 'Конвертер PNG в JPG онлайн бесплатно | AllConvert',
    metaDescription: 'Конвертируйте изображения PNG в формат JPG онлайн. Уменьшайте размер файлов без потери качества. Быстро, бесплатно и без регистрации.',
    h1: 'Онлайн конвертер PNG в JPG',
    subtitle: 'Уменьшайте размер файлов PNG и оптимизируйте изображения для веб-сайтов и публикаций',
    descriptionParagraphs: [
      'Файлы PNG обеспечивают отличное качество и прозрачность, но часто имеют большой вес. Преобразование PNG в JPG помогает существенно сократить размер файлов для быстрой загрузки страниц и отправки по почте.',
      'Наш сервис позволяет конвертировать прозрачный фоновый цвет в белый и сжимать снимки с выбранным уровнем качества прямо в браузере.'
    ],
    steps: [
      { step: 1, title: 'Загрузите PNG', text: 'Перетащите ваши файлы PNG в конвертер.' },
      { step: 2, title: 'Запустите конвертацию', text: 'Нажмите кнопку «Конвертировать все» или настройте параметры сжатия.' },
      { step: 3, title: 'Сохраните результат', text: 'Скачайте сжатые JPG файлы на ваш ПК или телефон.' }
    ],
    features: [
      { title: '📉 Экономия места', text: 'Сокращайте объем занимаемой памяти до 80% за счет сжатия JPEG.' },
      { title: '🚀 Мгновенно в браузере', text: 'Без ожидания загрузки на сервер и без очередей.' }
    ],
    faqs: [
      { q: 'Что происходит с прозрачным фоном PNG при сохранении в JPG?', a: 'Так как формат JPG не поддерживает альфа-канал прозрачности, прозрачные области автоматически заменяются на чистый белый цвет.' },
      { q: 'Теряется ли качество при конвертации?', a: 'Вы можете установить slider качества на 100% для максимальной четкости деталей.' }
    ]
  },
  'jpg-to-png': {
    slug: 'jpg-to-png',
    fromFormat: 'JPG',
    toFormat: 'PNG',
    category: 'image',
    title: 'Конвертер JPG в PNG онлайн бесплатно | AllConvert',
    metaDescription: 'Преобразуйте картинки и фото JPG в формат PNG с поддержкой высокой четкости и без потерь. Бесплатный удобный инструмент.',
    h1: 'Конвертер JPG в PNG онлайн',
    subtitle: 'Преобразуйте ваши снимки и графику в несжатый формат PNG',
    descriptionParagraphs: [
      'Формат PNG идеально подходит для графического дизайна, логотипов и скетчей, так как использует сжатие без потерь (Lossless). Конвертация JPG в PNG сохраняет четкость текста и элементов дизайна.'
    ],
    steps: [
      { step: 1, title: 'Добавьте JPG файлы', text: 'Выберите файлы на диске или перетащите их в форму.' },
      { step: 2, title: 'Нажмите Конвертировать', text: 'Получите готовые PNG файлы высокого качества.' }
    ],
    features: [
      { title: '✨ Без потерь качества', text: 'Сохраняем четкие контуры графики и текста.' }
    ],
    faqs: [
      { q: 'Станет ли фото прозрачным при конвертации из JPG в PNG?', a: 'Исходный JPG не содержит прозрачности, поэтому изображения останутся сплошными, но получат формат PNG.' }
    ]
  },
  'webp-to-jpg': {
    slug: 'webp-to-jpg',
    fromFormat: 'WEBP',
    toFormat: 'JPG',
    category: 'image',
    title: 'Конвертер WEBP в JPG онлайн бесплатно | AllConvert',
    metaDescription: 'Быстрый перевод файлов WEBP в привычный формат JPG. Открывайте сохраненные из интернета WEBP картинки в любых редакторах.',
    h1: 'Конвертер WEBP в JPG онлайн',
    subtitle: 'Преобразуйте современные изображения WEBP из интернета в универсальный формат JPG',
    descriptionParagraphs: [
      'Многие сайты отдают изображения в формате WebP. Однако их трудно открыть в старых графических редакторах или встроить в презентации. AllConvert вернет картинкам универсальный формат JPG.'
    ],
    steps: [
      { step: 1, title: 'Загрузите WEBP', text: 'Перетащите WEBP файлы в область загрузки.' },
      { step: 2, title: 'Скачайте JPG', text: 'Получите совместимые файл JPG за доли секунды.' }
    ],
    features: [
      { title: '🌐 Совместимость со всеми ПК', text: 'Файлы JPG открываются на любых устройствах и во всех программах.' }
    ],
    faqs: [
      { q: 'Почему файлы из интернета скачиваются в формате WEBP?', a: 'WebP используется веб-сайтами для ускорения загрузки страниц, но JPG остается самым совместимым форматом.' }
    ]
  },
  'pdf-to-jpg': {
    slug: 'pdf-to-jpg',
    fromFormat: 'PDF',
    toFormat: 'JPG',
    category: 'document',
    title: 'Конвертер PDF в JPG онлайн — извлечение страниц | AllConvert',
    metaDescription: 'Конвертируйте страницы PDF документов в картинки JPG высокого разрешения онлайн. Безопасная обработка в вашем браузере.',
    h1: 'Конвертер PDF в JPG онлайн',
    subtitle: 'Преобразуйте страницы документов PDF в четкие растровые изображения JPG',
    descriptionParagraphs: [
      'Вам нужно переслать страницу договора или скан документа в виде картинки? Наш сервис отрендерит страницы PDF в файлы JPG высокого качества.'
    ],
    steps: [
      { step: 1, title: 'Выберите PDF документ', text: 'Загрузите PDF файл любого объема.' },
      { step: 2, title: 'Получите изображения', text: 'Каждая страница будет преобразована в отдельный качественный файл JPG.' }
    ],
    features: [
      { title: '📄 Поддержка всех страниц', text: 'Быстрый рендеринг страниц векторных документов в растровые снимки.' }
    ],
    faqs: [
      { q: 'Безопасно ли загружать документы PDF?', a: 'Документы рендерятся локально на вашем компьютере с помощью браузерных библиотек PDF, конфиденциальные данные не уходят в сеть.' }
    ]
  },
  'mp4-to-mp3': {
    slug: 'mp4-to-mp3',
    fromFormat: 'MP4',
    toFormat: 'MP3',
    category: 'video',
    title: 'Конвертер MP4 в MP3 онлайн — извлечение аудио | AllConvert',
    metaDescription: 'Быстрое извлечение звуковых дорожек и музыки из видео MP4 в формат MP3 онлайн. Бесплатно и прямо в браузере.',
    h1: 'Конвертер MP4 в MP3 онлайн',
    subtitle: 'Извлекайте аудиодорожки и музыку из ваших видеофайлов в популярный формат MP3',
    descriptionParagraphs: [
      'Превращайте лекции, видеоклипы, вебинары и подкасты MP4 в компактные аудиофайлы MP3 для удобного прослушивания на смартфоне или в плеере.'
    ],
    steps: [
      { step: 1, title: 'Загрузите видео MP4', text: 'Перетащите ролик или выберите файл на ПК.' },
      { step: 2, title: 'Выберите битрейт', text: 'Укажите желаемое качество MP3 (128k, 192k, 256k, 320k).' },
      { step: 3, title: 'Скачайте MP3', text: 'Извлеките чистый звук за считанные секунды.' }
    ],
    features: [
      { title: '🎧 Настройка битрейта', text: 'Выбирайте от 64 kbps до 320 kbps студийного качества.' }
    ],
    faqs: [
      { q: 'Какое качество аудио выбрать?', a: 'Для музыки рекомендуется выбирать битрейт 256k или 320k, для речевых записей и подкастов достаточно 128k или 192k.' }
    ]
  },
  'mov-to-mp4': {
    slug: 'mov-to-mp4',
    fromFormat: 'MOV',
    toFormat: 'MP4',
    category: 'video',
    title: 'Конвертер MOV в MP4 онлайн бесплатно | AllConvert',
    metaDescription: 'Преобразуйте видеоролики QuickTime MOV с iPhone и Mac в универсальный формат MP4 (H.264). Быстрый конвертер онлайн.',
    h1: 'Конвертер MOV в MP4 онлайн',
    subtitle: 'Конвертируйте видео QuickTime с iPhone и Mac в стандартный формат MP4',
    descriptionParagraphs: [
      'Видеофайлы в формате MOV, записанные на технике Apple, могут не воспроизводиться на телевизорах, медиаплеерах и ПК под управлением Windows. Перевод в MP4 решает проблему совместимости.'
    ],
    steps: [
      { step: 1, title: 'Добавьте MOV видео', text: 'Выберите ролик MOV для обработки.' },
      { step: 2, title: 'Запустите конвертацию', text: 'Получите универсальное видео MP4.' }
    ],
    features: [
      { title: '🎬 H.264 & WebAssembly', text: 'Стандартная кодировка для отличного качества и минимального размера.' }
    ],
    faqs: [
      { q: 'Почему видео MOV не воспроизводится в Windows?', a: 'MOV — проприетарный формат Apple. Для универсального воспроизведения лучше перекодировать файл в MP4.' }
    ]
  },
  'mov-to-mp3': {
    slug: 'mov-to-mp3',
    fromFormat: 'MOV',
    toFormat: 'MP3',
    category: 'video',
    title: 'Конвертер MOV в MP3 онлайн — Извлечение аудио из MOV | AllConvert',
    metaDescription: 'Быстрое извлечение звука из роликов QuickTime MOV в формат MP3. Онлайн, бесплатно, без загрузки на сервер.',
    h1: 'Конвертер MOV в MP3 онлайн',
    subtitle: 'Извлекайте аудиодорожки и музыку из айфон-видео MOV в универсальный формат MP3',
    descriptionParagraphs: [
      'Файлы MOV с iPhone и Mac часто содержат ценные аудиозаписи, лекции или музыкальные треки. Перевод из MOV в MP3 позволяет слушать звук на любом устройстве.',
      'Обработка выполнятся локально с помощью WebAssembly FFmpeg без передач на сервер.'
    ],
    steps: [
      { step: 1, title: 'Загрузите MOV', text: 'Выберите или перетащите файл MOV с iPhone или Mac.' },
      { step: 2, title: 'Извлеките MP3', text: 'Нажмите «Конвертировать» для извлечения звукового потока.' }
    ],
    features: [
      { title: '🎧 Чистый звук', text: 'Извлечение дорожки без сжатия или с желаемым битрейтом.' }
    ],
    faqs: [
      { q: 'Как извлечь звук из видео с iPhone?', a: 'Просто перетащите ваш MOV файл, формат MP3 выберется автоматически, и нажмите кнопку запуска.' }
    ]
  },
  'avi-to-mp3': {
    slug: 'avi-to-mp3',
    fromFormat: 'AVI',
    toFormat: 'MP3',
    category: 'video',
    title: 'Конвертер AVI в MP3 онлайн — Извлечь звук из AVI | AllConvert',
    metaDescription: 'Извлекайте аудиодорожки из фильмов и клипов AVI в формат MP3 онлайн без потери качества.',
    h1: 'Конвертер AVI в MP3 онлайн',
    subtitle: 'Преобразуйте видеофайлы AVI в компактные аудиозаписи MP3',
    descriptionParagraphs: [
      'Старые видеозаписи и фильмы в формате AVI занимают много места. Перевод в MP3 экономит память и позволяет сохранить только звуковое сопровождение.'
    ],
    steps: [
      { step: 1, title: 'Выберите AVI файл', text: 'Загрузите AVI видео в окно конвертера.' },
      { step: 2, title: 'Скачайте MP3', text: 'Сохраните готовый MP3 файл.' }
    ],
    features: [
      { title: '⚡ Быстрое извлечение', text: 'Локальное отключение видеопотока за секунды.' }
    ],
    faqs: [
      { q: 'Можно ли конвертировать большие AVI файлы?', a: 'Да, AllConvert работает локально в браузере и ограничен только оперативной памятью вашего устройства.' }
    ]
  },
  'mkv-to-mp3': {
    slug: 'mkv-to-mp3',
    fromFormat: 'MKV',
    toFormat: 'MP3',
    category: 'video',
    title: 'Конвертер MKV в MP3 онлайн | AllConvert',
    metaDescription: 'Извлечение аудио из MKV контейнеров в MP3 онлайн. Бесплатно и быстро.',
    h1: 'Конвертер MKV в MP3 онлайн',
    subtitle: 'Быстрое извлечение звука из MKV видеофайлов',
    descriptionParagraphs: [
      'MKV содержит качественные аудиодорожки. Наш конвертер отделит звук и сохранит его в формате MP3.'
    ],
    steps: [
      { step: 1, title: 'Загрузите MKV', text: 'Перетащите ваш файл MKV.' },
      { step: 2, title: 'Получите MP3', text: 'Скачайте отдельный аудиофайл.' }
    ],
    features: [
      { title: '🔊 Поддержка битрейта', text: 'Выбор битрейта от 128k до 320k.' }
    ],
    faqs: [
      { q: 'Безопасно ли обрабатывать фильмовые MKV файлы?', a: 'Да, ваши файлы обрабатываются строго локально на вашем компьютере.' }
    ]
  },
  'webm-to-mp3': {
    slug: 'webm-to-mp3',
    fromFormat: 'WEBM',
    toFormat: 'MP3',
    category: 'video',
    title: 'Конвертер WEBM в MP3 онлайн | AllConvert',
    metaDescription: 'Перевод видео WEBM в аудио MP3. Извлекайте музыку и речи из скачанных из веб видеороликов.',
    h1: 'Конвертер WEBM в MP3 онлайн',
    subtitle: 'Извлечение аудио из роликов WEBP / WEBM',
    descriptionParagraphs: [
      'Видеоролики из интернета в формате WEBM легко превращаются в MP3 аудиотреки для плееров.'
    ],
    steps: [
      { step: 1, title: 'Загрузите WEBM', text: 'Выберите ролик WEBM.' },
      { step: 2, title: 'Сохраните MP3', text: 'Получите аудиофайл.' }
    ],
    features: [
      { title: '🎶 Отличное качество', text: 'Сохранение оригинальной частоты дискретизации.' }
    ],
    faqs: [
      { q: 'Сколько занимает конвертация WEBM в MP3?', a: 'Обычно от 1 до 5 секунд в зависимости от размера файла.' }
    ]
  },
  'wav-to-mp3': {
    slug: 'wav-to-mp3',
    fromFormat: 'WAV',
    toFormat: 'MP3',
    category: 'audio',
    title: 'Конвертер WAV в MP3 онлайн — Сжатие аудио | AllConvert',
    metaDescription: 'Конвертируйте несжатый звук WAV в MP3 онлайн. Уменьшайте объем аудио в 10 раз без ощутимой потери качества.',
    h1: 'Конвертер WAV в MP3 онлайн',
    subtitle: 'Сжимайте несжатые аудиозаписи WAV в легкий и совместимый формат MP3',
    descriptionParagraphs: [
      'Файлы WAV обладают высшим студийным качеством, но занимают гигабайты места. Сжатие в MP3 (320 kbps) сокращает объем до 90% при сохранении чистоты звучания.'
    ],
    steps: [
      { step: 1, title: 'Загрузите WAV', text: 'Добавьте аудиозапись WAV.' },
      { step: 2, title: 'Укажите битрейт', text: 'Выберите 320 kbps для музыки или 192 kbps для речи.' },
      { step: 3, title: 'Скачайте MP3', text: 'Сохраните сжатый трек.' }
    ],
    features: [
      { title: '📉 Экономия места', text: 'Уменьшение размера файла в 5-10 раз.' }
    ],
    faqs: [
      { q: 'Сильно ли ухудшится звук при конвертации из WAV в MP3?', a: 'При выборе битрейта 256k или 320k разница на слух практически неразличима.' }
    ]
  },
  'm4a-to-mp3': {
    slug: 'm4a-to-mp3',
    fromFormat: 'M4A',
    toFormat: 'MP3',
    category: 'audio',
    title: 'Конвертер M4A в MP3 онлайн бесплатно | AllConvert',
    metaDescription: 'Быстрый перевод диктофонных записей M4A с iPhone в универсальный формат MP3.',
    h1: 'Конвертер M4A в MP3 онлайн',
    subtitle: 'Преобразуйте диктофонные записи и музыку Apple M4A в формат MP3',
    descriptionParagraphs: [
      'Записи с диктофона iPhone сохраняются в M4A. Конвертер переведет их в MP3 для прослушивания на любых плеерах.'
    ],
    steps: [
      { step: 1, title: 'Загрузите M4A', text: 'Добавьте M4A аудиозапись.' },
      { step: 2, title: 'Скачайте MP3', text: 'Получите универсальный файл.' }
    ],
    features: [
      { title: '📱 Для всех айфонов', text: 'Мгновенное декодирование диктофонных заметок.' }
    ],
    faqs: [
      { q: 'Где находятся файлы M4A на iPhone?', a: 'Обычно это записи приложения «Диктофон» или экспортированная музыка.' }
    ]
  },
  'flac-to-mp3': {
    slug: 'flac-to-mp3',
    fromFormat: 'FLAC',
    toFormat: 'MP3',
    category: 'audio',
    title: 'Конвертер FLAC в MP3 онлайн | AllConvert',
    metaDescription: 'Перевод музыки Hi-Res FLAC в формат MP3. Быстро, удобно и безопасно.',
    h1: 'Конвертер FLAC в MP3 онлайн',
    subtitle: 'Адаптируйте тяжелые альбомы FLAC для любых автомагнитол и смартфонов',
    descriptionParagraphs: [
      'Формат FLAC обеспечивает безупречный звук без потерь, но не поддерживается многими автомагнитолами и встроенными плеерами. Перевод в MP3 решает эту проблему.'
    ],
    steps: [
      { step: 1, title: 'Загрузите FLAC треки', text: 'Перетащите музыкальные файлы.' },
      { step: 2, title: 'Получите MP3', text: 'Скачайте готовые треки.' }
    ],
    features: [
      { title: '🚗 Для машины и плеера', text: 'Запускайте треки на любых устройствах.' }
    ],
    faqs: [
      { q: 'Можно ли конвертировать сразу целый альбом FLAC?', a: 'Да, загружайте хоть 100 треков одновременно.' }
    ]
  },
  'ogg-to-mp3': {
    slug: 'ogg-to-mp3',
    fromFormat: 'OGG',
    toFormat: 'MP3',
    category: 'audio',
    title: 'Конвертер OGG в MP3 онлайн | AllConvert',
    metaDescription: 'Преобразование голосовых сообщений и треков OGG в формат MP3.',
    h1: 'Конвертер OGG в MP3 онлайн',
    subtitle: 'Перевод голосовых сообщений из мессенджеров OGG Vorbis в MP3',
    descriptionParagraphs: [
      'Файлы OGG часто используются в мессенджерах для голосовых сообщений. Конвертируйте их в MP3 для сохранения и редактирования.'
    ],
    steps: [
      { step: 1, title: 'Загрузите OGG', text: 'Выберите файл OGG.' },
      { step: 2, title: 'Скачайте MP3', text: 'Сохраните запись.' }
    ],
    features: [
      { title: '🎙️ Голосовые сообщения', text: 'Отличная разборчивость речи.' }
    ],
    faqs: [
      { q: 'Работает ли это с голосовыми из Telegram?', a: 'Да, скачайте файл OGG из мессенджера и перетащите в наш конвертер.' }
    ]
  },
  'aac-to-mp3': {
    slug: 'aac-to-mp3',
    fromFormat: 'AAC',
    toFormat: 'MP3',
    category: 'audio',
    title: 'Конвертер AAC в MP3 онлайн | AllConvert',
    metaDescription: 'Преобразуйте AAC треки в формат MP3 прямо в браузере.',
    h1: 'Конвертер AAC в MP3 онлайн',
    subtitle: 'Перевод аудиофайлов AAC в популярный MP3',
    descriptionParagraphs: [
      'AAC — распространенный кодек, но формат MP3 остается самым популярным для обмена файлами.'
    ],
    steps: [
      { step: 1, title: 'Загрузите AAC', text: 'Добавьте AAC файл.' },
      { step: 2, title: 'Получите MP3', text: 'Скачайте аудио.' }
    ],
    features: [
      { title: '⚡ Мгновенно', text: 'Обработка без очереди.' }
    ],
    faqs: [
      { q: 'Нужна ли регистрация?', a: 'Нет, конвертер полностью бесплатен.' }
    ]
  },
  'avif-to-jpg': {
    slug: 'avif-to-jpg',
    fromFormat: 'AVIF',
    toFormat: 'JPG',
    category: 'image',
    title: 'Конвертер AVIF в JPG онлайн бесплатно без потери качества | AllConvert',
    metaDescription: 'Бесплатный онлайн конвертер AVIF в JPG в браузере. Мгновенно преобразуйте файлы AVIF в универсальный JPG без отправки на сервер, с сохранением резкости и цветов.',
    h1: 'Бесплатный онлайн конвертер AVIF в JPG',
    subtitle: 'Мгновенное преобразование современных изображений AVIF в универсальный формат JPG прямо в браузере. Без потери качества, без ожидания загрузки на сервер и с полной конфиденциальностью ваших фотографий.',
    descriptionParagraphs: [
      'Формат AVIF (AV1 Image File Format) обеспечивает великолепную степень сжатия для веб-сайтов, однако за пределами современных браузеров он создает множество трудностей. Устаревшие операционные системы Windows и macOS, офисные пакеты, популярные графические редакторы (включая Photoshop, Figma, CorelDRAW), а также формы загрузки на маркетплейсах (Wildberries, Ozon, Avito) и в соцсетях часто отказываются открывать или принимать файлы с расширением .avif.',
      'Конвертация AVIF в JPG решает проблему несовместимости раз и навсегда. Наш онлайн-сервис AllConvert декодирует снимки локально на вашем компьютере или смартфоне с помощью технологий WebAssembly, сохраняя исходную четкость, контрастность и детализацию изображения без отправки исходников на сторонние серверы.'
    ],
    steps: [
      { step: 1, title: 'Выберите или перетащите файлы AVIF', text: 'Добавьте один или сразу несколько снимков в формате AVIF в поле загрузки.' },
      { step: 2, title: 'Настройте качество сжатия (опционально)', text: 'По умолчанию установлено максимальное качество 100%. При необходимости откройте настройки и отрегулируйте ползунок качества JPEG (от 50% до 100%) для контроля итогового размера.' },
      { step: 3, title: 'Мгновенно скачайте готовые JPG', text: 'Сохраните полученные файлы по отдельности или загрузите все изображения единым ZIP-архивом за один клик.' }
    ],
    features: [
      { title: '🔒 100% Конфиденциальность', text: 'Файлы обрабатываются в оперативной памяти вашего браузера и не загружаются в сеть.' },
      { title: '⚡ Пакетная обработка', text: 'Конвертируйте десятки изображений AVIF одновременно без ограничений на объем.' },
      { title: '🎯 Сохранение резкости и цветов', text: 'Точная передача цветовых профилей sRGB и глубоких полутонов без артефактов.' }
    ],
    faqs: [
      {
        q: 'Почему Photoshop и стандартные просмотрщики фото не открывают файлы AVIF?',
        a: 'Формат AVIF основан на видеокодеке нового поколения AV1. Большинство настольных программ и редакторов, выпущенных до 2022 года, не содержат встроенного декодера для этого стандарта. Преобразование в JPG делает изображение совместимым с абсолютно любой программой, операционной системой и мобильным устройством.'
      },
      {
        q: 'Почему размер готового JPG может оказаться больше исходного AVIF?',
        a: 'AVIF использует сверхэффективные алгоритмы сжатия данных, превосходящие классический JPEG на 40–60% по компактности при том же визуальном качестве. При распаковке AVIF и последующем сохранении в формат JPG файл восстанавливает стандартную структуру JPEG-сжатия, из-за чего его размер в байтах закономерно увеличивается для сохранения четкости.'
      },
      {
        q: 'Что происходит с прозрачным фоном при конвертации AVIF в JPG?',
        a: 'Спецификация формата JPG не поддерживает альфа-канал (прозрачность). При конвертации полупрозрачные и прозрачные участки автоматически заполняются нейтральным белым фоном. Если вам необходимо сохранить прозрачность, выберите формат PNG или WebP.'
      },
      {
        q: 'Безопасно ли конвертировать личные и служебные изображения?',
        a: 'Да, полностью безопасно. AllConvert работает на базе клиентских технологий WebAssembly — обработка каждого пикселя происходит исключительно в ОЗУ вашего устройства. Мы не передаем, не просматриваем и не сохраняем ваши файлы на серверах.'
      }
    ],
    translations: {
      en: {
        title: 'Free Online AVIF to JPG Converter without Quality Loss | AllConvert',
        metaDescription: 'Convert AVIF to JPG online in your browser. Fast, 100% private, and loss-free AVIF image conversion without uploading files to external servers.',
        h1: 'Free Online AVIF to JPG Converter',
        subtitle: 'Instantly convert modern AVIF images into universally supported JPG format directly in your browser. Zero quality loss, no server uploads, and complete privacy for your photos.',
        descriptionParagraphs: [
          'The AVIF (AV1 Image File Format) provides superior compression efficiency for websites, but creates compatibility issues outside modern browsers. Legacy Windows and macOS systems, office suites, popular image editors (including Photoshop, Figma, CorelDRAW), and marketplace upload forms often fail to open .avif files.',
          'Converting AVIF to JPG solves compatibility permanently. AllConvert decodes your images locally on your device via WebAssembly, preserving original sharpness, color fidelity, and contrast without uploading raw files to external servers.'
        ],
        steps: [
          { step: 1, title: 'Select or drop AVIF files', text: 'Add one or multiple AVIF images into the upload area.' },
          { step: 2, title: 'Configure compression quality (optional)', text: 'By default, images convert at 100% maximum quality. Adjust the JPEG quality slider (50% to 100%) in settings if you need smaller file size.' },
          { step: 3, title: 'Instantly download JPG', text: 'Save converted images individually or download all photos in a single ZIP archive.' }
        ],
        features: [
          { title: '🔒 100% In-Browser Privacy', text: 'Processing is executed locally inside your browser memory. Your files never leave your device.' },
          { title: '⚡ Fast Batch Processing', text: 'Convert dozens of files at once without limits and download them in a single ZIP archive.' },
          { title: '🎯 High Quality Output', text: 'Preserves maximum detail, sharpness, and sRGB color profiles without compression artifacts.' }
        ],
        faqs: [
          {
            q: 'Why can\'t Photoshop or standard photo viewers open AVIF files?',
            a: 'AVIF is built on the modern AV1 video codec. Most desktop software and image editors released prior to 2022 do not include a native decoder for this format. Converting to JPG ensures universal compatibility across all operating systems, apps, and devices.'
          },
          {
            q: 'Why is the resulting JPG file larger than the original AVIF?',
            a: 'AVIF uses highly advanced next-gen compression, making it 40–60% smaller than legacy JPEG at identical visual quality. When converting to standard JPG, the image is re-encoded into traditional JPEG blocks, which naturally requires more bytes to preserve clarity.'
          },
          {
            q: 'What happens to transparency (alpha channel) during AVIF to JPG conversion?',
            a: 'The JPG format specification does not support alpha-channel transparency. Any transparent or translucent pixels are automatically filled with a clean white background. To preserve transparency, convert your AVIF to PNG or WebP instead.'
          },
          {
            q: 'Is it safe to convert private and sensitive images on AllConvert?',
            a: 'Yes, 100% secure. AllConvert operates entirely in your device\'s local memory (RAM) via WebAssembly. Your photos and graphics are never sent across the network or stored on any server.'
          }
        ]
      },
      zh: {
        title: '免费在线 AVIF 转 JPG 转换器 — 无损画质 | AllConvert',
        metaDescription: '在浏览器中直接将 AVIF 转换为 JPG 图像。无需上传服务器，100% 本地隐私保护，保留高清细节与鲜艳色彩。',
        h1: '免费在线 AVIF 转 JPG 转换器',
        subtitle: '在浏览器中直接将现代 AVIF 图像瞬间转换为通用的 JPG 格式。无质量损失，无需上传到云端服务器，全面保护照片隐私。',
        descriptionParagraphs: [
          'AVIF（AV1 图像文件格式）为网页提供了极佳的压缩效率，但在现代浏览器之外却存在较多兼容性障碍。较旧的 Windows 和 macOS 系统、办公套件、主流图像处理软件（如旧版 Photoshop、Figma、CorelDRAW）以及各类电商平台与社交媒体往往无法打开或识别 .avif 格式。',
          '将 AVIF 转换为 JPG 可彻底解决兼容性问题。AllConvert 借助 WebAssembly 技术直接在您的本地设备上解码图片，在无需将原图上传至任何外部服务器的前提下，完美保留原始清晰度、对比度和细节。'
        ],
        steps: [
          { step: 1, title: '选择或拖放 AVIF 文件', text: '将单个或多个 AVIF 图像添加到上传区域。' },
          { step: 2, title: '调整压缩质量（可选）', text: '默认采用 100% 最高画质转换。如需缩减文件大小，可在设置面板中自由调节 50%–100% 的 JPEG 质量滑块。' },
          { step: 3, title: '瞬间下载 JPG 图像', text: '单独保存转换后的 JPG 图片，或一键打包下载包含全部文件的 ZIP 压缩包。' }
        ],
        features: [
          { title: '🔒 100% 本地极速隐私', text: '所有转换均在浏览器内存中本地执行，文件绝不会上传或离开您的设备。' },
          { title: '⚡ 批量高效转换', text: '一键同时转换数十张 AVIF 图片，无数量限制，并支持直接打包为 ZIP。' },
          { title: '🎯 高清品质输出', text: '精确保留 sRGB 色彩配置文件与细腻半色调，避免压缩伪影。' }
        ],
        faqs: [
          {
            q: '为什么 Photoshop 和系统默认看图工具打不开 AVIF 文件？',
            a: 'AVIF 格式基于下一代 AV1 视频编码标准构建。多数 2022 年以前发布的桌面软件和看图工具未内置该标准的解码器。转换为标准 JPG 格式后，可确保其在任何操作系统、应用程序和移动设备上无缝打开。'
          },
          {
            q: '为什么转换出来的 JPG 文件体积可能比原始 AVIF 更大？',
            a: 'AVIF 采用了领先的压缩算法，在同等视觉质量下比传统 JPEG 体积小 40%–60%。当转换为标准 JPG 时，图像会还原为经典 JPEG 编码结构，因此需要占用更多字节以维持画质清晰度。'
          },
          {
            q: '将 AVIF 转换为 JPG 时透明背景会发生什么变化？',
            a: 'JPG 格式规范本身不支持透明通道（Alpha 通道）。在转换过程中，透明与半透明区域会自动填充为纯白背景。如果您需要保留透明背景，请选择转换为 PNG 或 WebP 格式。'
          },
          {
            q: '在 AllConvert 上转换私人照片安全吗？',
            a: '是的，绝对安全。AllConvert 完全基于 WebAssembly 本地技术运行，所有像素处理均在您设备的本地内存中完成，绝不会向任何服务器传输或存储您的数据。'
          }
        ]
      },
      es: {
        title: 'Convertidor de AVIF a JPG en línea gratis y sin pérdida de calidad | AllConvert',
        metaDescription: 'Convierta AVIF a JPG gratis directamente en su navegador. Conversión rápida, 100% privada y sin enviar archivos a servidores externos.',
        h1: 'Convertidor en línea gratuito de AVIF a JPG',
        subtitle: 'Transforme instantáneamente imágenes AVIF en formato JPG universal en su navegador. Sin pérdida de calidad, sin esperas y con total privacidad de sus fotografías.',
        descriptionParagraphs: [
          'El formato AVIF ofrece una excelente compresión para la web, pero genera problemas de compatibilidad en sistemas operativos antiguos, suites de oficina y editores como Photoshop o CorelDRAW.',
          'Convertir AVIF a JPG soluciona la incompatibilidad por completo. AllConvert procesa las imágenes localmente mediante WebAssembly conservando nitidez, colores y detalles originales sin enviar archivos a servidores.'
        ],
        steps: [
          { step: 1, title: 'Seleccione o arrastre archivos AVIF', text: 'Añada una o varias imágenes AVIF a la zona de carga.' },
          { step: 2, title: 'Ajuste la calidad de compresión (opcional)', text: 'Por defecto la calidad es del 100%. Puede ajustar el control de calidad JPEG (50% a 100%) en la configuración si necesita un archivo más ligero.' },
          { step: 3, title: 'Descargue sus imágenes JPG', text: 'Guarde las fotos individualmente o descargue todas juntas en un archivo ZIP con un solo clic.' }
        ],
        features: [
          { title: '🔒 100% Privacidad en navegador', text: 'El procesamiento se ejecuta localmente en la memoria de su navegador sin salir de su dispositivo.' },
          { title: '⚡ Procesamiento en lote rápido', text: 'Convierta decenas de archivos a la vez sin límites y descárguelos en un archivo ZIP.' },
          { title: '🎯 Calidad de salida superior', text: 'Conserva el máximo detalle, nitidez y perfiles de color sRGB sin artefactos.' }
        ],
        faqs: [
          {
            q: '¿Por qué Photoshop y los visores estándar no abren archivos AVIF?',
            a: 'AVIF se basa en el códec de vídeo AV1. La mayoría de los programas anteriores a 2022 carecen de decodificador para este estándar. La conversión a JPG garantiza total compatibilidad en cualquier dispositivo o app.'
          },
          {
            q: '¿Por qué el archivo JPG resultante puede pesar más que el AVIF original?',
            a: 'AVIF utiliza algoritmos de compresión modernos hasta un 60% más eficientes que JPEG. Al guardar en JPG clásico, el archivo recupera la estructura tradicional requiriendo más bytes para mantener la nitidez.'
          },
          {
            q: '¿Qué ocurre con la transparencia al convertir AVIF a JPG?',
            a: 'El formato JPG no admite canal alfa (transparencia). Las áreas transparentes se sustituyen automáticamente por un fondo blanco. Si necesita conservar la transparencia, elija PNG o WebP.'
          },
          {
            q: '¿Es seguro convertir fotos personales en AllConvert?',
            a: 'Sí, totalmente seguro. La conversión se procesa exclusivamente en la memoria RAM de su equipo mediante WebAssembly, sin enviar sus imágenes a ningún servidor externo.'
          }
        ]
      },
      de: {
        title: 'Kostenloser Online AVIF zu JPG Konverter ohne Qualitätsverlust | AllConvert',
        metaDescription: 'Konvertieren Sie AVIF in JPG direkt im Browser. Schnell, 100% privat und ohne Datei-Upload auf externe Server.',
        h1: 'Kostenloser Online AVIF zu JPG Konverter',
        subtitle: 'Wandeln Sie moderne AVIF-Bilder blitzschnell im Browser in das universelle JPG-Format um. Ohne Qualitätsverlust und mit maximalem Datenschutz.',
        descriptionParagraphs: [
          'Das AVIF-Format bietet herausragende Kompression für das Web, verursacht jedoch Kompatibilitätsprobleme in älteren Betriebssystemen und Grafikprogrammen wie Photoshop oder CorelDRAW.',
          'Die Konvertierung von AVIF in JPG löst dieses Problem dauerhaft. AllConvert verarbeitet Bilder lokal im Browser via WebAssembly unter Erhalt von Schärfe, Kontrast und Farbtreue.'
        ],
        steps: [
          { step: 1, title: 'AVIF-Dateien auswählen oder ablegen', text: 'Fügen Sie einzelne oder mehrere AVIF-Dateien zum Upload-Bereich hinzu.' },
          { step: 2, title: 'Kompressionsqualität anpassen (optional)', text: 'Standardmäßig ist 100% Qualität eingestellt. Über die Einstellungen können Sie den Schieberegler (50%–100%) anpassen.' },
          { step: 3, title: 'JPG-Bilder herunterladen', text: 'Speichern Sie fertige JPG-Dateien einzeln oder laden Sie alle Bilder gesammelt in einer ZIP-Datei herunter.' }
        ],
        features: [
          { title: '🔒 100% Browser-Datenschutz', text: 'Die Verarbeitung erfolgt lokal in Ihrem Browser. Ihre Dateien verlassen niemals Ihr Gerät.' },
          { title: '⚡ Schnelle Stapelverarbeitung', text: 'Konvertieren Sie Dutzende von Dateien gleichzeitig ohne Einschränkungen und laden Sie diese als ZIP herunter.' },
          { title: '🎯 Höchste Ausgabequalität', text: 'Bewahrt maximale Details, Schärfe und sRGB-Farbprofile ohne Kompressionsartefakte.' }
        ],
        faqs: [
          {
            q: 'Warum können Photoshop und Standard-Bildbetrachter keine AVIF-Dateien öffnen?',
            a: 'AVIF basiert auf dem AV1-Videocodec. Die meisten vor 2022 veröffentlichten Programme enthalten keinen Decoder dafür. Die Umwandlung in JPG stellt universelle Kompatibilität sicher.'
          },
          {
            q: 'Warum ist die resultierende JPG-Datei oft größer als die AVIF-Originaldatei?',
            a: 'AVIF komprimiert bis zu 60% effizienter als klassisches JPEG. Beim Speichern als JPG werden traditionelle JPEG-Blöcke erzeugt, was mehr Bytes für dieselbe Bildschärfe erfordert.'
          },
          {
            q: 'Was passiert mit transparenten Bereichen bei der AVIF zu JPG Konvertierung?',
            a: 'Das JPG-Format unterstützt keine Transparenz (Alpha-Kanal). Transparente Bereiche werden automatisch mit weißem Hintergrund gefüllt. Wählen Sie PNG oder WebP, um Transparenz zu erhalten.'
          },
          {
            q: 'Ist die Konvertierung persönlicher Bilder auf AllConvert sicher?',
            a: 'Ja, absolut sicher. AllConvert arbeitet vollständig lokal im Arbeitsspeicher Ihres Geräts über WebAssembly. Es werden keinerlei Dateien an externe Server übertragen.'
          }
        ]
      },
      fr: {
        title: 'Convertisseur AVIF en JPG en ligne gratuit sans perte de qualité | AllConvert',
        metaDescription: 'Convertissez AVIF en JPG en ligne dans votre navigateur. Rapide, 100% privé et sans téléchargement sur des serveurs externes.',
        h1: 'Convertisseur AVIF en JPG en ligne gratuit',
        subtitle: 'Convertissez instantanément vos images AVIF au format universel JPG dans votre navigateur. Sans perte de qualité et avec une confidentialité totale.',
        descriptionParagraphs: [
          'Le format AVIF offre une excellente compression pour le web, mais pose des problèmes de compatibilité avec les anciens systèmes et logiciels tels que Photoshop ou CorelDRAW.',
          'La conversion vers JPG résout définitivement ce problème. AllConvert traite vos images localement via WebAssembly en préservant netteté et couleurs sans envoyer de fichiers sur un serveur.'
        ],
        steps: [
          { step: 1, title: 'Sélectionnez ou déposez des fichiers AVIF', text: 'Ajoutez une ou plusieurs images AVIF dans la zone de dépôt.' },
          { step: 2, title: 'Ajustez la qualité de compression (optionnel)', text: 'La qualité par défaut est de 100%. Ajustez le curseur (50% à 100%) dans les paramètres si vous souhaitez réduire le poids du fichier.' },
          { step: 3, title: 'Téléchargez vos images JPG', text: 'Enregistrez les photos individuellement ou téléchargez tout en une archive ZIP.' }
        ],
        features: [
          { title: '🔒 100% Confidentialité locale', text: 'Le traitement est exécuté localement dans votre navigateur. Vos fichiers ne quittent jamais votre appareil.' },
          { title: '⚡ Traitement en lot rapide', text: 'Convertissez des dizaines de fichiers à la fois sans limite et téléchargez-les dans une archive ZIP.' },
          { title: '🎯 Qualité de sortie supérieure', text: 'Conserve le maximum de détails, de netteté et de profils de couleurs sans artefacts.' }
        ],
        faqs: [
          {
            q: 'Pourquoi Photoshop et les visionneuses standard n\'ouvrent-ils pas les fichiers AVIF ?',
            a: 'AVIF est basé sur le codec vidéo moderne AV1. Les logiciels antérieurs à 2022 n\'intègrent pas ce décodeur. La conversion en JPG assure une compatibilité universelle.'
          },
          {
            q: 'Pourquoi le fichier JPG obtenu est-il parfois plus lourd que l\'AVIF d\'origine ?',
            a: 'AVIF offre une compression jusqu\'à 60% plus efficace que JPEG. La conversion vers le format classique JPG recrée des blocs JPEG traditionnels nécessitant plus d\'octets.'
          },
          {
            q: 'Que devient la transparence lors de la conversion AVIF vers JPG ?',
            a: 'Le format JPG ne supporte pas la transparence (canal alpha). Les zones transparentes sont automatiquement remplacées par un fond blanc. Pour conserver la transparence, choisissez PNG ou WebP.'
          },
          {
            q: 'Est-il sécurisé de convertir des images personnelles sur AllConvert ?',
            a: 'Oui, totalement sûr. AllConvert fonctionne exclusivement dans la mémoire vive de votre appareil via WebAssembly. Aucun fichier n\'est transmis sur un serveur.'
          }
        ]
      }
    }
  },
  'png-to-ico': {
    slug: 'png-to-ico',
    fromFormat: 'PNG',
    toFormat: 'ICO',
    category: 'image',
    title: 'Конвертер PNG в ICO онлайн — Создание Favicon | AllConvert',
    metaDescription: 'Создавайте иконки ICO и фавиконки для сайтов из логотипов PNG онлайн.',
    h1: 'Конвертер PNG в ICO онлайн',
    subtitle: 'Превратите иконки и логотипы PNG в иконки сайтов и программ ICO',
    descriptionParagraphs: [
      'Создавайте фавиконки (favicon.ico) для веб-сайтов или иконки для ярлыков приложений Windows из прозрачных изображений PNG.'
    ],
    steps: [
      { step: 1, title: 'Загрузите PNG', text: 'Выберите квадратный логотип PNG.' },
      { step: 2, title: 'Скачайте ICO', text: 'Получите готовый файл favicon.ico.' }
    ],
    features: [
      { title: '🌐 Для сайтов и приложений', text: 'Генерация правильной структуры ICO.' }
    ],
    faqs: [
      { q: 'Какой размер PNG лучше выбрать для favicon?', a: 'Рекомендуется пропорция 1:1, например 512x512 или 256x256 пикселей.' }
    ]
  },
  'pdf-to-png': {
    slug: 'pdf-to-png',
    fromFormat: 'PDF',
    toFormat: 'PNG',
    category: 'document',
    title: 'Конвертер PDF в PNG онлайн — Высокое разрешение | AllConvert',
    metaDescription: 'Конвертируйте страницы PDF в картинки PNG с поддержкой высокой четкости деталей.',
    h1: 'Конвертер PDF в PNG онлайн',
    subtitle: 'Преобразуйте документы PDF в четкие растровые изображения PNG',
    descriptionParagraphs: [
      'Перевод страниц PDF в PNG идеально подходит для сохранения скан-копий с четким текстом и графиками без смазывания.'
    ],
    steps: [
      { step: 1, title: 'Загрузите PDF', text: 'Выберите документ PDF.' },
      { step: 2, title: 'Сохраните PNG', text: 'Скачайте высококачественные картинки PNG.' }
    ],
    features: [
      { title: '🔍 Высокое разрешение', text: 'Четкие шрифты и векторная графика.' }
    ],
    faqs: [
      { q: 'Будет ли каждая страница отдельным PNG?', a: 'Да, каждая страница сохраняется в свой файл PNG.' }
    ]
  },
  'webp-to-png': {
    slug: 'webp-to-png',
    fromFormat: 'WEBP',
    toFormat: 'PNG',
    category: 'image',
    title: 'Конвертер WEBP в PNG онлайн бесплатно | AllConvert',
    metaDescription: 'Сохраняйте прозрачность и качество при переводе WEBP в формат PNG.',
    h1: 'Конвертер WEBP в PNG онлайн',
    subtitle: 'Сохранение прозрачности и максимальной четкости при конвертации WEBP в PNG',
    descriptionParagraphs: [
      'Если исходный файл WEBP содержит прозрачный фон, перевод в PNG полностью сохранит этот альфа-канал без закрашивания белым.'
    ],
    steps: [
      { step: 1, title: 'Загрузите WEBP', text: 'Выберите изображение WEBP.' },
      { step: 2, title: 'Скачайте PNG', text: 'Получите готовый файл PNG с прозрачностью.' }
    ],
    features: [
      { title: '✨ Сохранение альфа-канала', text: 'Прозрачные фоны остаются прозрачными.' }
    ],
    faqs: [
      { q: 'Сохранится ли прозрачность логотипа?', a: 'Да, формат PNG полностью поддерживает прозрачность.' }
    ]
  },
  'jpg-to-webp': {
    slug: 'jpg-to-webp',
    fromFormat: 'JPG',
    toFormat: 'WEBP',
    category: 'image',
    title: 'Конвертер JPG в WEBP онлайн — Ускорение сайта | AllConvert',
    metaDescription: 'Оптимизируйте картинки JPG для веба, переводя их в формат WebP со сжатием нового поколения.',
    h1: 'Конвертер JPG в WEBP онлайн',
    subtitle: 'Сократите размер фотографий JPG на 30-50% для ускорения сайтов',
    descriptionParagraphs: [
      'WebP — современный стандарт изображений от Google. Конвертация фотографий JPG в WebP помогает значительно ускорить загрузку страниц вашего сайта.'
    ],
    steps: [
      { step: 1, title: 'Загрузите JPG', text: 'Перетащите ваши снимки JPG.' },
      { step: 2, title: 'Скачайте WEBP', text: 'Получите оптимизированные файлы для публикации.' }
    ],
    features: [
      { title: '🚀 Ускорение Google PageSpeed', text: 'Улучшает показатели SEO вашего сайта.' }
    ],
    faqs: [
      { q: 'На сколько уменьшится размер файла?', a: 'В среднем WebP легче на 30–50% по сравнению с аналогичным JPG.' }
    ]
  },
  'xlsx-to-csv': {
    slug: 'xlsx-to-csv',
    fromFormat: 'XLSX',
    toFormat: 'CSV',
    category: 'document',
    title: 'Конвертер XLSX в CSV онлайн | AllConvert',
    metaDescription: 'Преобразуйте таблицы Excel (XLSX) в текстовые файлы CSV онлайн.',
    h1: 'Конвертер XLSX в CSV онлайн',
    subtitle: 'Быстрый экспорт таблиц Excel в универсальный формат данных CSV',
    descriptionParagraphs: [
      'Файлы CSV легко импортируются в базы данных, CRM системы и скрипты аналитики. Наш конвертер моментально преобразует листы Excel в CSV.'
    ],
    steps: [
      { step: 1, title: 'Загрузите файл Excel', text: 'Выберите таблицу XLSX.' },
      { step: 2, title: 'Скачайте CSV', text: 'Получите структурированный CSV документ.' }
    ],
    features: [
      { title: '📊 Табличные данные', text: 'Сохранение кодировки UTF-8 и разделителей.' }
    ],
    faqs: [
      { q: 'Какой разделитель используется в CSV?', a: 'По умолчанию используется стандартная запятая или точка с запятой.' }
    ]
  },
  'json-to-csv': {
    slug: 'json-to-csv',
    fromFormat: 'JSON',
    toFormat: 'CSV',
    category: 'document',
    title: 'Конвертер JSON в CSV онлайн | AllConvert',
    metaDescription: 'Преобразуйте массивы данных JSON в плоские таблицы CSV для анализа в Excel.',
    h1: 'Конвертер JSON в CSV онлайн',
    subtitle: 'Преобразуйте файлы данных JSON в удобный табличный формат CSV',
    descriptionParagraphs: [
      'Превратите структурированные выгрузки из API в привычные таблицы для чтения в Excel или Google Таблицах.'
    ],
    steps: [
      { step: 1, title: 'Загрузите JSON', text: 'Выберите файл JSON.' },
      { step: 2, title: 'Скачайте CSV', text: 'Получите готовую таблицу.' }
    ],
    features: [
      { title: '💻 Для разработчиков и аналитиков', text: 'Автоматическое плоское разворачивание структур.' }
    ],
    faqs: [
      { q: 'Поддерживаются ли вложенные массивы?', a: 'Да, простые структуры и массивы объектов корректно заносятся в колонки.' }
    ]
  },
  'pdf-to-txt': {
    slug: 'pdf-to-txt',
    fromFormat: 'PDF',
    toFormat: 'TXT',
    category: 'document',
    title: 'Конвертер PDF в TXT онлайн — Извлечение текста | AllConvert',
    metaDescription: 'Быстро извлекайте чистый текстовый контент из файлов PDF без форматирования.',
    h1: 'Конвертер PDF в TXT онлайн',
    subtitle: 'Извлекайте текстовое содержимое из PDF документов в обычный блокнот TXT',
    descriptionParagraphs: [
      'Вам нужен только текст из книги или отчета PDF? Скопируйте и извлеките всю текстовую информацию в простой текстовый файл TXT.'
    ],
    steps: [
      { step: 1, title: 'Загрузите PDF', text: 'Добавьте документ PDF.' },
      { step: 2, title: 'Скачайте TXT', text: 'Получите извлеченный текст.' }
    ],
    features: [
      { title: '📝 Без мусора', text: 'Только чистый текст в кодировке UTF-8.' }
    ],
    faqs: [
      { q: 'Сработает ли это на сканированных страницах без слоя текста?', a: 'Извлекается текстовый слой документа PDF. Для сканов рекомендуется использовать страницы с поддержкой OCR.' }
    ]
  },
  'pdf-to-word': {
    slug: 'pdf-to-word',
    fromFormat: 'PDF',
    toFormat: 'Word (DOCX)',
    category: 'document',
    title: 'Конвертер PDF в Word (DOCX) — бесплатно и онлайн',
    metaDescription: 'Бесплатный онлайн-конвертер PDF в Word (DOCX). Преобразуйте PDF в редактируемый документ Microsoft Word (.docx) быстро, безопасно и без установки программ.',
    h1: 'Конвертер PDF в Word (DOCX) онлайн',
    subtitle: 'Мгновенное преобразование документов PDF в редактируемые файлы Word (DOCX) с 100% приватностью в браузере',
    descriptionParagraphs: [
      'Конвертируйте PDF в документ Microsoft Word (DOCX) онлайн. Формат DOCX является современным форматом документов Word и поддерживается Microsoft Word, LibreOffice и другими текстовыми редакторами.',
      'AllConvert выполняет конвертацию прямо в вашем браузере с помощью современных веб-технологий. Ваши личные и корпоративные файлы не передаются на сторонние серверы, что гарантирует абсолютную конфиденциальность и мгновенную скорость.'
    ],
    steps: [
      { step: 1, title: 'Загрузите документ PDF', text: 'Перетащите ваш файл PDF в область загрузки или нажмите «Выбрать файлы».' },
      { step: 2, title: 'Выберите формат Word (DOCX)', text: 'Убедитесь, что выбран целевой формат DOCX / Word.' },
      { step: 3, title: 'Скачайте готовый документ', text: 'Нажмите «Конвертировать» и сохраните полученный файл Word.' }
    ],
    features: [
      { title: '🔒 100% Локальный приватный процесс', text: 'Обработка документов происходит исключительно в оперативной памяти вашего браузера.' },
      { title: '✏️ Редактируемый результат', text: 'Преобразуйте текстовый слой PDF в формат Word для удобного редактирования.' },
      { title: '⚡ Мгновенная выгрузка', text: 'Конвертируйте файлы за считанные секунды без подписок, платных тарифов и ограничений.' }
    ],
    faqs: [
      { q: 'Можно ли редактировать полученный файл Word?', a: 'Да, созданный документ DOCX можно открывать и свободно редактировать в Microsoft Word, Google Документах или LibreOffice.' },
      { q: 'Безопасно ли конвертировать личные и финансовые PDF документы?', a: 'Абсолютно! Обработка выполняется 100% локально на вашем устройстве, и файлы не передаются на внешние серверы.' },
      { q: 'Нужно ли платить за конвертацию PDF в Word?', a: 'Нет, сервис AllConvert полностью бесплатен и работает без регистрации.' }
    ]
  }
};

/**
 * Parses a slug like "heic-to-jpg" or "png-to-jpg" or "mp4-to-mp3".
 * Falls back to dynamic generic data if not in POPULAR_SEO_ROUTES.
 */
export function getSeoPageDataBySlug(slug: string): SeoConversionRoute {
  const normalizedSlug = slug.toLowerCase().trim();
  
  if (POPULAR_SEO_ROUTES[normalizedSlug]) {
    return POPULAR_SEO_ROUTES[normalizedSlug];
  }

  // Parse "from-to-to" e.g., "heic-to-jpg" or "heic-v-jpg" or "heic-in-jpg"
  const parts = normalizedSlug.split(/[-_](?:to|v|in|vinto)[-_]/);
  let from = 'FILE';
  let to = 'JPG';

  if (parts.length === 2) {
    from = parts[0].toUpperCase();
    to = parts[1].toUpperCase();
  } else {
    // Try simple split by "-" if exactly 2 parts
    const simple = normalizedSlug.split('-');
    if (simple.length === 2) {
      from = simple[0].toUpperCase();
      to = simple[1].toUpperCase();
    }
  }

  // Deduce category
  let category: ConversionCategory = 'image';
  const audioExts = ['MP3', 'WAV', 'OGG', 'FLAC', 'AAC', 'M4A', 'OPUS', 'WMA', 'AIFF'];
  const videoExts = ['MP4', 'WEBM', 'AVI', 'MOV', 'MKV', 'WMV', 'FLV', '3GP', 'GIF'];
  const docExts = ['PDF', 'TXT', 'DOCX', 'XLSX', 'EPUB', 'HTML', 'JSON', 'CSV'];

  if (audioExts.includes(from) || audioExts.includes(to)) category = 'audio';
  else if (videoExts.includes(from) || videoExts.includes(to)) category = 'video';
  else if (docExts.includes(from) || docExts.includes(to)) category = 'document';

  return {
    slug: normalizedSlug,
    fromFormat: from,
    toFormat: to,
    category,
    title: `Конвертер ${from} в ${to} онлайн бесплатно — AllConvert`,
    metaDescription: `Быстрый и бесплатный онлайн конвертер ${from} в ${to}. Конвертируйте файлы ${from} в ${to} прямо в браузере без потери качества и без серверов.`,
    h1: `Онлайн конвертер ${from} в ${to}`,
    subtitle: `Преобразуйте файлы ${from} в формат ${to} мгновенно и безопасно прямо в вашем браузере`,
    descriptionParagraphs: [
      `Сервис AllConvert позволяет преобразовать файлы ${from} в формат ${to} без установки тяжелого программного обеспечения. Все операции выполняются локально в вашем веб-браузере.`,
      `Ваши данные остаются в полной безопасности, так как не передаются на внешние серверы.`
    ],
    steps: [
      { step: 1, title: `Загрузите ${from}`, text: `Выберите или перетащите файлы ${from} в окно конвертера.` },
      { step: 2, title: `Укажите формат ${to}`, text: `Формат ${to} выбран по умолчанию. При необходимости подстройте параметры.` },
      { step: 3, title: `Скачайте результат`, text: `Сохраните готовые файлы ${to} на ваш компьютер или телефон.` }
    ],
    features: [
      { title: '⚡ Высокая скорость', text: 'Обработка без ожидания загрузки на сервер.' },
      { title: '🔒 Приватность', text: 'Конвертация производится на стороне клиента в браузере.' }
    ],
    faqs: [
      { q: `Как конвертировать ${from} в ${to}?`, a: `Просто перетащите файл ${from} в поле загрузки, выберите ${to} и нажмите «Скачать».` },
      { q: 'Нужно ли платить за использование?', a: 'Нет, AllConvert полностью бесплатен и не требует регистрации.' }
    ]
  };
}

export function getLocalizedSeoRoute(route: SeoConversionRoute, langCode: string): SeoConversionRoute {
  const supported = ['ru', 'en', 'zh', 'es', 'de'];
  // Fallback to English if non-Russian language is selected and not directly mapped
  const lang = supported.includes(langCode) ? langCode : (langCode === 'ru' ? 'ru' : 'en');

  if (lang === 'ru') {
    return route;
  }

  const from = route.fromFormat;
  const to = route.toFormat;

  const templates: Record<string, {
    title: string;
    metaDescription: string;
    h1: string;
    subtitle: string;
    descriptionParagraphs: string[];
    steps: { step: number; title: string; text: string }[];
    features: { title: string; text: string }[];
    faqs: { q: string; a: string }[];
  }> = {
    en: {
      title: `Online ${from} to ${to} Converter — Fast & Free | AllConvert`,
      metaDescription: `Free online ${from} to ${to} converter. Convert your ${from} files to ${to} directly in your browser without quality loss or server uploads.`,
      h1: `Online ${from} to ${to} Converter`,
      subtitle: `Instant conversion of ${from} files to ${to} format with 100% in-browser privacy (zero server uploads)`,
      descriptionParagraphs: [
        `The ${from} format is widely used, but converting to ${to} ensures maximum compatibility across all devices and operating systems. AllConvert allows you to convert ${from} to ${to} instantly inside your browser using WebAssembly technology.`,
        `Your personal files never leave your device memory, guaranteeing 100% confidentiality, zero tracking, and ultra-fast processing speed.`
      ],
      steps: [
        { step: 1, title: `Select or drop ${from} files`, text: `Drag & drop your ${from} files into the dropzone or click "Choose Files".` },
        { step: 2, title: `Configure ${to} settings`, text: `Verify that ${to} is selected as the target format and adjust quality if needed.` },
        { step: 3, title: `Convert & Download ${to}`, text: `Click "Convert" to process files instantly and save them individually or as a ZIP archive.` }
      ],
      features: [
        { title: '🔒 100% In-Browser Privacy', text: 'Processing is executed locally inside your browser memory. Your files never leave your device.' },
        { title: '⚡ Fast Batch Processing', text: 'Convert dozens of files at once without limits and download them in a single ZIP archive.' },
        { title: '🎯 High Quality Output', text: 'Preserves maximum detail, clarity, and original media quality parameters.' }
      ],
      faqs: [
        { q: `How does the online ${from} to ${to} conversion work?`, a: `Conversion runs directly inside your web browser using WebAssembly and WebCodecs technology. Your files are never uploaded to any external servers.` },
        { q: `Is it safe to convert ${from} files on AllConvert?`, a: `Yes, 100%. All files are processed strictly locally on your computer or phone. Nobody else can access or view your files.` },
        { q: `Can I convert multiple ${from} files at once?`, a: `Yes, AllConvert supports unlimited batch conversion and allows you to download all converted files in one ZIP archive.` }
      ]
    },
    zh: {
      title: `在线 ${from} 转 ${to} 转换器 — 快速且免费 | AllConvert`,
      metaDescription: `免费在线 ${from} 转 ${to} 转换器。在浏览器中直接将 ${from} 文件转换为 ${to} 格式，无质量损失，无服务器上传。`,
      h1: `在线 ${from} 转 ${to} 转换器`,
      subtitle: `将 ${from} 文件瞬间转换为 ${to} 格式，100% 浏览器本地处理（零服务器上传，保护隐私）`,
      descriptionParagraphs: [
        `${from} 格式被广泛使用，但转换为 ${to} 格式可确保在所有设备和操作系统上的最佳兼容性。AllConvert 允许您通过 WebAssembly 技术在浏览器内部瞬间完成 ${from} 到 ${to} 的转换。`,
        `您的文件绝不会离开您的设备内存，从而保障 100% 的隐私安全、零数据追踪和极速转换体验。`
      ],
      steps: [
        { step: 1, title: `选择或拖放 ${from} 文件`, text: `将您的 ${from} 文件拖入上传区域，或点击“选择文件”按钮。` },
        { step: 2, title: `确认 ${to} 参数`, text: `确认目标格式为 ${to}，必要时可在设置中微调质量与比特率。` },
        { step: 3, title: `转换并下载 ${to}`, text: `点击“转换”，即可单独或打包为 ZIP 压缩包快速保存您的 ${to} 文件。` }
      ],
      features: [
        { title: '🔒 100% 本地极速隐私', text: '所有转换均在您的浏览器内存中本地执行，文件绝不会上传或离开您的设备。' },
        { title: '⚡ 批量高效转换', text: '一键同时转换数十个文件，无数量限制，并可直接打包导出为 ZIP。' },
        { title: '🎯 高清品质输出', text: '最大程度保留原文件的细节、清晰度与音视频品质参数。' }
      ],
      faqs: [
        { q: `${from} 转 ${to} 的在线转换是如何工作的？`, a: `转换直接在您的 Web 浏览器中使用 WebAssembly 与 WebCodecs 技术完成。您的文件绝对不会上传到任何外部服务器。` },
        { q: `在 AllConvert 上转换 ${from} 文件安全吗？`, a: `是的，绝对安全。所有文件均仅在您的电脑或手机本地处理。除了您自己之外，没有人能访问或查看您的文件。` },
        { q: `我可以一次转换多个 ${from} 文件吗？`, a: `可以，AllConvert 支持无限制批量上传转换，并支持一键下载包含所有已完成文件的 ZIP 包。` }
      ]
    },
    es: {
      title: `Convertidor de ${from} a ${to} en línea gratis | AllConvert`,
      metaDescription: `Convertidor en línea gratuito de ${from} a ${to}. Convierta sus archivos ${from} a ${to} directamente en el navegador sin pérdida de calidad ni carga en el servidor.`,
      h1: `Convertidor en línea de ${from} a ${to}`,
      subtitle: `Conversión instantánea de archivos ${from} a formato ${to} con 100% de privacidad en el navegador (sin cargas en el servidor)`,
      descriptionParagraphs: [
        `El formato ${from} se utiliza ampliamente, pero convertirlo a ${to} garantiza la máxima compatibilidad en todos los dispositivos y sistemas operativos. AllConvert le permite convertir ${from} a ${to} al instante dentro de su navegador mediante tecnología WebAssembly.`,
        `Sus archivos personales nunca salen de la memoria de su dispositivo, lo que garantiza una confidencialidad del 100%, cero seguimiento y una velocidad ultra rápida.`
      ],
      steps: [
        { step: 1, title: `Seleccione o arrastre archivos ${from}`, text: `Arrastre sus archivos ${from} a la zona de carga o haga clic en "Elegir Archivos".` },
        { step: 2, title: `Configure los ajustes para ${to}`, text: `Verifique que ${to} esté seleccionado como formato de destino y ajuste la calidad si es necesario.` },
        { step: 3, title: `Convertir y Descargar ${to}`, text: `Haga clic en "Convertir" para procesar archivos e instantáneamente guardarlos individualmente o en ZIP.` }
      ],
      features: [
        { title: '🔒 100% Privacidad en navegador', text: 'El procesamiento se ejecuta localmente en la memoria del navegador. Sus archivos nunca salen de su dispositivo.' },
        { title: '⚡ Procesamiento en lote rápido', text: 'Convierta docenas de archivos a la vez sin límites y descárguelos en un solo archivo ZIP.' },
        { title: '🎯 Calidad de salida superior', text: 'Conserva el máximo detalle, claridad y parámetros de calidad originales.' }
      ],
      faqs: [
        { q: `¿Cómo funciona la conversión en línea de ${from} a ${to}?`, a: `La conversión se ejecuta directamente en su navegador web utilizando tecnología WebAssembly. Sus archivos nunca se cargan en servidores externos.` },
        { q: `¿Es seguro convertir archivos ${from} en AllConvert?`, a: `Sí, 100% seguro. Todos los archivos se procesan estrictamente de forma local en su ordenador o teléfono. Nadie más tiene acceso a sus datos.` },
        { q: `¿Puedo convertir varios archivos ${from} a la vez?`, a: `Sí, AllConvert admite conversión en lote ilimitada y le permite descargar todos los archivos en un solo ZIP.` }
      ]
    },
    de: {
      title: `Kostenloser Online-${from}-zu-${to}-Konverter | AllConvert`,
      metaDescription: `Kostenloser Online-${from}-zu-${to}-Konverter. Konvertieren Sie Ihre ${from}-Dateien direkt im Browser in ${to} ohne Qualitätsverlust und ohne Server-Upload.`,
      h1: `Online-${from}-zu-${to}-Konverter`,
      subtitle: `Sofortige Konvertierung von ${from}-Dateien in das ${to}-Format mit 100% Browser-Datenschutz (ohne Server-Upload)`,
      descriptionParagraphs: [
        `Das Format ${from} ist weit verbreitet, aber die Konvertierung in ${to} gewährleistet maximale Kompatibilität auf allen Geräten und Betriebssystemen. AllConvert ermöglicht Ihnen die sofortige Konvertierung von ${from} in ${to} direkt im Browser über WebAssembly-Technologie.`,
        `Ihre persönlichen Dateien verlassen niemals den Speicher Ihres Geräts. Das garantiert 100% Vertraulichkeit und maximale Geschwindigkeit.`
      ],
      steps: [
        { step: 1, title: `${from}-Dateien auswählen oder ablegen`, text: `Ziehen Sie Ihre ${from}-Dateien in den Bereich oder klicken Sie auf "Dateien auswählen".` },
        { step: 2, title: `Einstellungen für ${to} anpassen`, text: `Stellen Sie sicher, dass ${to} als Zielformat ausgewählt ist, und passen Sie bei Bedarf die Qualität an.` },
        { step: 3, title: `Konvertieren & ${to} herunterladen`, text: `Klicken Sie auf "Konvertieren", um Dateien verarbeiten zu lassen und einzeln oder als ZIP zu speichern.` }
      ],
      features: [
        { title: '🔒 100% Browser-Datenschutz', text: 'Die Verarbeitung erfolgt lokal in Ihrem Browser. Ihre Dateien verlassen niemals Ihr Gerät.' },
        { title: '⚡ Schnelle Stapelverarbeitung', text: 'Konvertieren Sie Dutzende von Dateien gleichzeitig ohne Einschränkungen und laden Sie diese als ZIP herunter.' },
        { title: '🎯 Höchste Ausgabequalität', text: 'Bewahrt maximale Details, Klarheit und originale Qualitätsparameter.' }
      ],
      faqs: [
        { q: `Wie funktioniert die Online-Konvertierung von ${from} in ${to}?`, a: `Die Konvertierung läuft direkt in Ihrem Browser mithilfe von WebAssembly. Ihre Dateien werden niemals auf externe Server hochgeladen.` },
        { q: `Ist es sicher, ${from}-Dateien auf AllConvert zu konvertieren?`, a: `Ja, absolut. Alle Dateien werden streng lokal auf Ihrem Computer oder Telefon verarbeitet. Niemand sonst hat Zugriff auf Ihre Daten.` },
        { q: `Kann ich mehrere ${from}-Dateien gleichzeitig konvertieren?`, a: `Ja, AllConvert unterstützt unbegrenzte Stapelverarbeitung und ermöglicht den Download aller Dateien in einem ZIP-Archiv.` }
      ]
    },
    fr: {
      title: `Convertisseur ${from} en ${to} en ligne gratuit | AllConvert`,
      metaDescription: `Convertisseur en ligne gratuit de ${from} en ${to}. Convertissez vos fichiers ${from} en ${to} directement dans votre navigateur sans perte de qualité ni envoi sur un serveur.`,
      h1: `Convertisseur en ligne ${from} en ${to}`,
      subtitle: `Conversion instantanée des fichiers ${from} au format ${to} avec 100% de confidentialité dans le navigateur (zéro envoi sur serveur)`,
      descriptionParagraphs: [
        `Le format ${from} est très répandu, mais la conversion vers ${to} garantit une compatibilité maximale sur tous les appareils et systèmes d'exploitation. AllConvert vous permet de convertir ${from} en ${to} instantanément dans votre navigateur via la technologie WebAssembly.`,
        `Vos fichiers personnels ne quittent jamais la mémoire de votre appareil, garantissant 100% de confidentialité et une vitesse ultra-rapide.`
      ],
      steps: [
        { step: 1, title: `Sélectionnez ou déposez des fichiers ${from}`, text: `Glissez-déposez vos fichiers ${from} dans la zone de dépôt ou cliquez sur « Choisir des fichiers ».` },
        { step: 2, title: `Configurez les paramètres ${to}`, text: `Vérifiez que ${to} est sélectionné comme format cible et ajustez la qualité si nécessaire.` },
        { step: 3, title: `Convertir & Télécharger ${to}`, text: `Cliquez sur « Convertir » et enregistrez vos fichiers ${to} individuellement ou en archive ZIP.` }
      ],
      features: [
        { title: '🔒 100% Confidentialité locale', text: 'Le traitement est exécuté localement dans votre navigateur. Vos fichiers ne quittent jamais votre appareil.' },
        { title: '⚡ Traitement en lot rapide', text: 'Convertissez des dizaines de fichiers à la fois sans limite et téléchargez-les dans une archive ZIP.' },
        { title: '🎯 Qualité de sortie supérieure', text: 'Conserve le maximum de détails, de clarté et de paramètres de qualité d\'origine.' }
      ],
      faqs: [
        { q: `Comment fonctionne la conversion en ligne de ${from} en ${to} ?`, a: `La conversion s'exécute directement dans votre navigateur grâce aux technologies WebAssembly. Vos fichiers ne sont jamais envoyés vers des serveurs externes.` },
        { q: `Est-ce sûr de convertir des fichiers ${from} sur AllConvert ?`, a: `Oui, absolument. Tous les fichiers sont traités strictement en local sur votre ordinateur ou téléphone. Personne d'autre n'a accès à vos données.` },
        { q: `Puis-je convertir plusieurs fichiers ${from} à la fois ?`, a: `Oui, AllConvert prend en charge la conversion par lot illimitée et vous permet de tout télécharger dans un seul fichier ZIP.` }
      ]
    }
  };

  const localized = templates[lang] || templates.en;
  const custom = route.translations?.[lang];

  return {
    ...route,
    title: custom?.title ?? localized.title,
    metaDescription: custom?.metaDescription ?? localized.metaDescription,
    h1: custom?.h1 ?? localized.h1,
    subtitle: custom?.subtitle ?? localized.subtitle,
    descriptionParagraphs: custom?.descriptionParagraphs ?? localized.descriptionParagraphs,
    steps: custom?.steps ?? localized.steps,
    features: custom?.features ?? localized.features,
    faqs: custom?.faqs ?? localized.faqs
  };
}

