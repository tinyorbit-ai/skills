fix(campaigns): keep new audiences scoped to their event

New campaign audiences now begin with an event filter, including campaigns that use
the visual audience builder. The scope stays in the audience metadata throughout the
editor so recipients from another event cannot be selected.
