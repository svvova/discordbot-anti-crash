export type SupportedLanguage = 'en' | 'ru' | 'uk';

export const SupportedLanguages: Record<SupportedLanguage, string> = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
};

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value in SupportedLanguages;
}

const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'common.adminOnly': 'Only administrators can use this command.',
    'errors.commandExecution': 'An error occurred while executing the command.',

    'settings.view.title': 'Settings for {guild}',
    'settings.view.threshold': 'Threshold',
    'settings.view.logChannel': 'Log channel',
    'settings.view.logChannelDisabled': 'disabled',
    'settings.view.recovery': 'Recovery',
    'settings.view.punishment': 'Punishment',
    'settings.view.timeout': 'Timeout',
    'settings.view.missingBotPerms': 'Missing bot permissions',
    'settings.view.none': 'none',

    'settings.thresholdSet': 'Threshold set to {value}.',
    'settings.thresholdShow': 'Current threshold: {threshold}.',
    'settings.logChannelSet': 'Log channel set to {channel}.',
    'settings.logChannelDisable': 'Log channel disabled.',
    'settings.recoveryToggle': 'Recovery {state}.',
    'settings.recoveryEnabled': 'enabled',
    'settings.recoveryDisabled': 'disabled',
    'settings.punishmentInvalid': 'Invalid punishment mode.',
    'settings.punishmentSet': 'Punishment mode set to {mode}.',
    'commands.unknownSubcommand': 'Unknown subcommand.',

    'stats.title': 'Incident Statistics',
    'stats.total': 'Total',
    'stats.last24h': 'Last 24h',
    'stats.last7d': 'Last 7d',
    'stats.byAction': 'By action',
    'stats.byPunishment': 'By punishment',
    'stats.none': 'none',

    'language.set': 'Language set to {language}.',
    'language.invalid': 'Invalid language. Supported: {languages}.',

    'incident.title': 'Anti-Crash Alert',
    'incident.action': 'Action',
    'incident.executor': 'Executor',
    'incident.target': 'Target',
    'incident.scoreThreshold': 'Score / Threshold',
    'incident.punishment': 'Punishment',
    'incident.recovery': 'Recovery',
    'incident.recoverySuccess': 'success',
    'incident.recoveryFailed': 'failed',
    'incident.none': 'none',
    'incident.correlationId': 'Correlation ID',
  },
  ru: {
    'common.adminOnly': 'Эту команду могут использовать только администраторы.',
    'errors.commandExecution': 'Произошла ошибка при выполнении команды.',

    'settings.view.title': 'Настройки {guild}',
    'settings.view.threshold': 'Порог',
    'settings.view.logChannel': 'Канал логов',
    'settings.view.logChannelDisabled': 'отключён',
    'settings.view.recovery': 'Восстановление',
    'settings.view.punishment': 'Наказание',
    'settings.view.timeout': 'Таймаут',
    'settings.view.missingBotPerms': 'Недостающие права бота',
    'settings.view.none': 'нет',

    'settings.thresholdSet': 'Порог установлен на {value}.',
    'settings.thresholdShow': 'Текущий порог: {threshold}.',
    'settings.logChannelSet': 'Канал логов установлен: {channel}.',
    'settings.logChannelDisable': 'Канал логов отключён.',
    'settings.recoveryToggle': 'Восстановление {state}.',
    'settings.recoveryEnabled': 'включено',
    'settings.recoveryDisabled': 'отключено',
    'settings.punishmentInvalid': 'Недопустимый режим наказания.',
    'settings.punishmentSet': 'Режим наказания установлен: {mode}.',
    'commands.unknownSubcommand': 'Неизвестная подкоманда.',

    'stats.title': 'Статистика инцидентов',
    'stats.total': 'Всего',
    'stats.last24h': 'За 24 часа',
    'stats.last7d': 'За 7 дней',
    'stats.byAction': 'По действию',
    'stats.byPunishment': 'По наказанию',
    'stats.none': 'нет',

    'language.set': 'Язык установлен: {language}.',
    'language.invalid': 'Недопустимый язык. Поддерживаются: {languages}.',

    'incident.title': 'Тревога Anti-Crash',
    'incident.action': 'Действие',
    'incident.executor': 'Исполнитель',
    'incident.target': 'Цель',
    'incident.scoreThreshold': 'Счёт / Порог',
    'incident.punishment': 'Наказание',
    'incident.recovery': 'Восстановление',
    'incident.recoverySuccess': 'успешно',
    'incident.recoveryFailed': 'не удалось',
    'incident.none': 'нет',
    'incident.correlationId': 'ID корреляции',
  },
  uk: {
    'common.adminOnly': 'Цю команду можуть використовувати лише адміністратори.',
    'errors.commandExecution': 'Сталася помилка під час виконання команди.',

    'settings.view.title': 'Налаштування {guild}',
    'settings.view.threshold': 'Поріг',
    'settings.view.logChannel': 'Канал логів',
    'settings.view.logChannelDisabled': 'вимкнено',
    'settings.view.recovery': 'Відновлення',
    'settings.view.punishment': 'Покарання',
    'settings.view.timeout': 'Таймаут',
    'settings.view.missingBotPerms': 'Відсутні права бота',
    'settings.view.none': 'немає',

    'settings.thresholdSet': 'Поріг встановлено на {value}.',
    'settings.thresholdShow': 'Поточний поріг: {threshold}.',
    'settings.logChannelSet': 'Канал логів встановлено: {channel}.',
    'settings.logChannelDisable': 'Канал логів вимкнено.',
    'settings.recoveryToggle': 'Відновлення {state}.',
    'settings.recoveryEnabled': 'увімкнено',
    'settings.recoveryDisabled': 'вимкнено',
    'settings.punishmentInvalid': 'Неприпустимий режим покарання.',
    'settings.punishmentSet': 'Режим покарання встановлено: {mode}.',
    'commands.unknownSubcommand': 'Невідома підкоманда.',

    'stats.title': 'Статистика інцидентів',
    'stats.total': 'Всього',
    'stats.last24h': 'За 24 години',
    'stats.last7d': 'За 7 днів',
    'stats.byAction': 'За дією',
    'stats.byPunishment': 'За покаранням',
    'stats.none': 'немає',

    'language.set': 'Мову встановлено: {language}.',
    'language.invalid': 'Неприпустима мова. Підтримуються: {languages}.',

    'incident.title': 'Тривога Anti-Crash',
    'incident.action': 'Дія',
    'incident.executor': 'Виконавець',
    'incident.target': 'Ціль',
    'incident.scoreThreshold': 'Рахунок / Поріг',
    'incident.punishment': 'Покарання',
    'incident.recovery': 'Відновлення',
    'incident.recoverySuccess': 'успішно',
    'incident.recoveryFailed': 'не вдалося',
    'incident.none': 'немає',
    'incident.correlationId': 'ID кореляції',
  },
};

export function t(
  lang: SupportedLanguage,
  key: keyof typeof translations.en,
  vars: Record<string, string | number> = {}
): string {
  const value = translations[lang]?.[key] ?? translations.en[key] ?? key;
  return value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}
