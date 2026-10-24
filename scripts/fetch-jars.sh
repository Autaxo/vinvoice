#!/bin/sh
# Downloads the Schematron toolchain from Maven Central into .cache/jars and verifies SHA-256.
# Saxon-HE (MPL-2.0), XML Resolver (Apache-2.0), SchXslt (MIT). Not redistributed by this repo.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
JARS=${VINVOICE_JARS:-$ROOT/.cache/jars}
mkdir -p "$JARS"
M=https://repo1.maven.org/maven2

fetch() { # path sha256
  f="$JARS/$(basename "$1")"
  [ -f "$f" ] || curl -fsSL "$M/$1" -o "$f"
  echo "$2  $f" | shasum -a 256 -c - >/dev/null || { echo "checksum mismatch: $f" >&2; rm -f "$f"; exit 1; }
}
fetch net/sf/saxon/Saxon-HE/12.5/Saxon-HE-12.5.jar 98c3a91e6e5aaf9b3e2b37601e04b214a6e67098493cdd8232fcb705fddcb674
fetch org/xmlresolver/xmlresolver/5.2.2/xmlresolver-5.2.2.jar efc92bd7ed32b3e57095e0b3e872051ccfbbdcc980831ef33e89e38161a85222
fetch name/dmaus/schxslt/schxslt/1.10.1/schxslt-1.10.1.jar 4f4f21edab7b37f96ad59ae12a344d3510f1092ac46b6d81a4efa0120b73cb58

# SchXslt ships its XSLT inside the jar.
[ -d "$JARS/schxslt" ] || (mkdir -p "$JARS/schxslt" && cd "$JARS/schxslt" && unzip -q ../schxslt-1.10.1.jar 'xslt/*')
echo "jars ready in $JARS"
