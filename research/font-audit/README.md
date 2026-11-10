# Font audit (site branch claude/project-thread-8cs2wl @ 958bb74)

29 public page types x 2 widths (1440, 390) = 58 page loads on http://localhost, headless Edge.
Every visible element with direct text plus all button/input/select/textarea (incl. ::placeholder) was checked.

Result: all 58 OK. First font-family is Nunito on every checked element; document.fonts has only Nunito 300/400/600/700 loaded, no other loaded fonts. Only iframe: Google Maps on /contact (ignored).
