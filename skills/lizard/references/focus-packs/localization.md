# Localization Focus Pack

Load when changed files or PR context mention locale files, translation keys, copy, date/time/number/currency formatting, pluralization, right-to-left text, user-visible errors, emails, notifications, or generated documents.

Look for:

- New copy added to only one locale or copied untranslated into other locales.
- Raw user-facing strings that bypass the repo's translation/message layer.
- Plural/count messages that cannot express language-specific plural rules.
- Date/time/number/currency formatting that ignores locale or timezone.
- String concatenation that prevents translators from reordering placeholders.
- Keys that are inconsistent, duplicated, stale, or too specific/general for reuse.
- Fallback behavior that silently ships the wrong language for important errors/actions.

Good findings cite the user-visible impact and local convention, then suggest the smallest direction: add real translations, structure placeholders/counts, move formatting to a locale-aware boundary, or use the existing message/catalog workflow.

Reference basis: localization/i18n platform guidance and local repo conventions.
