
Rendering A, combining caron looks different in the whole font vs using a font subset to A, combining caron.

Command line:

```shell
$ hb-shape EBGaramond\[wght\].ttf --unicodes=U+41,U+30c --ned
[uni01CD]

$ pyftsubset --unicodes=U+41,U+30c --output-file=EBpy.ttf EBGaramond\[wght\].ttf
$ hb-shape EBpy.ttf --unicodes=U+41,U+30c --ned
[gid1|gid2@692,0]

$ hb-subset  --unicodes=U+41,U+30c --output-file=EBhb.ttf EBGaramond\[wght\].ttf
$ hb-shape EBhb.ttf --unicodes=U+41,U+30c --ned
[gid1|gid2@692,0]
```

When rendered the caron sits off to the right rather than atop the A like a lovely inverted hat.
