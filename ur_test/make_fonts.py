from pathlib import Path

from fontTools import ttLib, subset

_SUBSETS = [
	("AW", {ord("A"), ord("W")}),
	("A-comb-caron", {
		ord("A"),
		0x30c,  # combining caron
	}),
	("A-with-caron", {
		0x1cd,  # capital a with caron
		0x1ce,  # small a with caron
	}),
]


def main():
	# has a very tightly kerned AW and supports combining
	font_file = Path.home() / "oss" / "fonts" / "ofl" / "ebgaramond" / "EBGaramond[wght].ttf"
	assert font_file.is_file()

	for (name_suffix, codepoints) in _SUBSETS:
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

	print("Font Faces")
	for font_file in Path(__file__).parent.rglob("*.ttf"):
		font = ttLib.TTFont(font_file)
		codepoints = font["cmap"].getBestCmap().keys()
		unicode_range = ",".join(f"U+{cp:04x}" for cp in sorted(codepoints))
		name = font["name"].getBestFamilyName()
		print(f"/* {font_file.name} */")
		print("@font-face {")
		print(f"  font-family: 'EB Garamond';")
		print(f"  src: url(./{font_file.name});")
		print(f"  unicode-range: {unicode_range};")
		print("}")
if __name__ == "__main__":
	main()