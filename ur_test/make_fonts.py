from pathlib import Path

from fontTools import ttLib, subset

# (name, subset codepoints, description)
# When used as unicode-range, taken as lowest to highest priority
_SUBSETS = [
	("A-comb-caron", {
		ord("A"),
		0x30c,  # combining caron
		0x1cd,  # capital a with caron
	}, "A, comb caron, precomposed A comb caron"
	),
	# Don't do this, we run afoul of https://github.com/harfbuzz/harfbuzz/issues/2283
	# ("A-with-caron", {
	# 	0x1cd,  # capital a with caron
	# 	0x1ce,  # small a with caron
	# }),
	("AW", {ord("A"), ord("W")}, "AW, playing the role of latin"),
]


def main():
	# has a very tightly kerned AW and supports combining
	font_file = Path.home() / "oss" / "fonts" / "ofl" / "ebgaramond" / "EBGaramond[wght].ttf"
	assert font_file.is_file()

	range_fonts = []
	for (name_suffix, codepoints, desc) in _SUBSETS:
		font = ttLib.TTFont(font_file)

		options = subset.Options()
		subsetter = subset.Subsetter(options=options)
		subsetter.populate(unicodes=codepoints)
		subsetter.subset(font)

		# Make it easy to tell which was used in dev tools
		names = font["name"].names
		for i in range(len(names) -1, -1, -1):
			name = names[i]
			if name.nameID > 6:
				del names[i]
			if not name.isUnicode():
				continue
			value = name.toUnicode().replace("Garamond", f"Garamond-{name_suffix}")
			name.string = value


		out_file = Path(__file__).parent / f"EBGaramond-{name_suffix}.ttf"
		font.save(out_file)
		print("Wrote", out_file)
		range_fonts.append((out_file, desc))

	print("Font Faces")
	for (font_file, desc) in range_fonts:
		font = ttLib.TTFont(font_file)
		codepoints = font["cmap"].getBestCmap().keys()
		unicode_range = ",".join(f"U+{cp:04x}" for cp in sorted(codepoints))
		name = font["name"].getBestFamilyName()
		print(f"/* {font_file.name} {desc} */")
		print("@font-face {")
		print(f"  font-family: 'EB Garamond';")
		print(f"  src: url(./{font_file.name});")
		print(f"  unicode-range: {unicode_range};")
		print("}")
if __name__ == "__main__":
	main()