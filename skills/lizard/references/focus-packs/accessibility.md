# Accessibility Focus Pack

Load when changed files or PR context mention interactive UI, forms, buttons, links, navigation, dialogs, focus, keyboard behavior, labels, semantic markup, color, media, or assistive technology.

Look for:

- Interactive elements without keyboard access, visible focus, correct role/semantics, or disabled/loading state semantics.
- Inputs without accessible labels, descriptions, errors, required state, or grouping.
- Dialogs/popovers/menus that do not manage focus, escape/close behavior, or background interaction.
- Color/contrast/status indicators that rely on color alone.
- Dynamic updates/toasts/errors that are not announced or are announced too noisily.
- Images/icons/media missing accessible names or alternative text when they convey meaning.
- New navigation patterns that disrupt heading order, landmarks, tab order, or screen-reader expectations.

Good findings explain the affected user interaction, cite the local component/design-system pattern if present, and suggest the smallest accessible direction: semantic element, label, ARIA only when needed, focus management, keyboard behavior, or text alternative.

Reference basis: W3C/WAI WCAG guidance.
