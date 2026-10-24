#!/bin/sh
# Compiles generated/vinvoice.sch with SchXslt, runs it on every corpus file with Saxon-HE and
# compares the findings with the reference checker (checker/test_schematron.py).
# Uses a local Java 17+ if there is one, otherwise the eclipse-temurin:21-jdk Docker image.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
JARS=${VINVOICE_JARS:-$ROOT/.cache/jars}
OUT=$ROOT/.cache/schematron
sh "$ROOT/scripts/fetch-jars.sh" >/dev/null
rm -rf "$OUT" && mkdir -p "$OUT"

if java -version >/dev/null 2>&1; then
  run_java() { java "$@"; }
else
  run_java() { docker run --rm -v "$ROOT:$ROOT" -v "$JARS:$JARS" -w "$ROOT" eclipse-temurin:21-jdk java "$@"; }
fi
CP="$JARS/Saxon-HE-12.5.jar:$JARS/xmlresolver-5.2.2.jar"
saxon() { run_java -cp "$CP" net.sf.saxon.Transform "$@"; }

saxon -xsl:"$JARS/schxslt/xslt/2.0/pipeline-for-svrl.xsl" -s:"$ROOT/generated/vinvoice.sch" -o:"$OUT/vinvoice.xsl"
for f in "$ROOT"/corpus/*.xml; do
  saxon -xsl:"$OUT/vinvoice.xsl" -s:"$f" -o:"$OUT/$(basename "$f" .xml).svrl"
done
python3 -I "$ROOT/checker/compare_schematron.py" "$OUT"
