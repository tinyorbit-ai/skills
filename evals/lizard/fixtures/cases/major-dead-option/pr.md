fix(catalog): enable partial-name search in the product picker

Typing part of a product name now returns matching catalog products. The picker opts
into partial matching, search metacharacters are escaped, and the focused test covers
the new matcher behavior.
