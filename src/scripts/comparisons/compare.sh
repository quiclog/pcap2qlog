#!/bin/bash

# e.g.,  in the root dir, call   ./src/scripts/comparisons/compare.sh FILE /srv/binary/input /srv/binary/output  (note: FILE without the .qlog extension!)
# e.g., ./src/scripts/comparisons/compare.sh large /home/rmarx/WORK/binary/input /home/rmarx/WORK/binary/output

mkdir $3/$1
node out/main.js --mode=jsonMinify --input=$2/$1.qlog --output=$3/$1

node out/main.js --mode=qlogLookup --input=$3/$1/$1_jsonMinify.qlog --output=$3/$1
node out/main.js --mode=qlogCbor --input=$3/$1/$1_jsonMinify.qlog --output=$3/$1
node out/main.js --mode=qlogCbor --input=$3/$1/$1_jsonMinify_qlogLookup.qlog --output=$3/$1
node out/main.js --mode=qlogProtobuf --input=$3/$1/$1_jsonMinify.qlog --output=$3/$1

echo "Compressing with xz"

xz -9 -k $3/$1/$1_jsonMinify.qlog
xz -9 -k $3/$1/$1_jsonMinify_qlogCbor.cbor
xz -9 -k $3/$1/$1_jsonMinify_qlogLookup.qlog
xz -9 -k $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor
xz -9 -k $3/$1/$1_jsonMinify_qlogProtobuf.protobuf

echo "Compressing with gzip 9"

gzip -9 --suffix="_9.gz" -k $3/$1/$1_jsonMinify.qlog
gzip -9 --suffix="_9.gz" -k $3/$1/$1_jsonMinify_qlogCbor.cbor
gzip -9 --suffix="_9.gz" -k $3/$1/$1_jsonMinify_qlogLookup.qlog
gzip -9 --suffix="_9.gz" -k $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor
gzip -9 --suffix="_9.gz" -k $3/$1/$1_jsonMinify_qlogProtobuf.protobuf

echo "Compressing with gzip 6"

gzip -6 --suffix="_6.gz" -k $3/$1/$1_jsonMinify.qlog
gzip -6 --suffix="_6.gz" -k $3/$1/$1_jsonMinify_qlogCbor.cbor
gzip -6 --suffix="_6.gz" -k $3/$1/$1_jsonMinify_qlogLookup.qlog
gzip -6 --suffix="_6.gz" -k $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor
gzip -6 --suffix="_6.gz" -k $3/$1/$1_jsonMinify_qlogProtobuf.protobuf

echo "Compressing with zstd"

zstd -15 $3/$1/$1_jsonMinify.qlog
zstd -15 $3/$1/$1_jsonMinify_qlogCbor.cbor
zstd -15 $3/$1/$1_jsonMinify_qlogLookup.qlog
zstd -15 $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor
zstd -15 $3/$1/$1_jsonMinify_qlogProtobuf.protobuf

echo "Compressing with lz4"

lz4 -9 $3/$1/$1_jsonMinify.qlog
lz4 -9 $3/$1/$1_jsonMinify_qlogCbor.cbor
lz4 -9 $3/$1/$1_jsonMinify_qlogLookup.qlog
lz4 -9 $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor
lz4 -9 $3/$1/$1_jsonMinify_qlogProtobuf.protobuf

echo "Compressing with brotli 4"

brotli --quality 4 --input $3/$1/$1_jsonMinify.qlog --output $3/$1/$1_jsonMinify_4.brotli
brotli --quality 4 --input $3/$1/$1_jsonMinify_qlogCbor.cbor --output $3/$1/$1_jsonMinify_qlogCbor_4.brotli
brotli --quality 4 --input $3/$1/$1_jsonMinify_qlogLookup.qlog --output $3/$1/$1_jsonMinify_qlogLookup_4.brotli
brotli --quality 4 --input $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor --output $3/$1/$1_jsonMinify_qlogLookup_qlogCbor_4.brotli
brotli --quality 4 --input $3/$1/$1_jsonMinify_qlogProtobuf.protobuf --output $3/$1/$1_jsonMinify_qlogProtobuf_4.brotli

echo "Compressing with brotli 11"

brotli --quality 11 --input $3/$1/$1_jsonMinify.qlog --output $3/$1/$1_jsonMinify_11.brotli
brotli --quality 11 --input $3/$1/$1_jsonMinify_qlogCbor.cbor --output $3/$1/$1_jsonMinify_qlogCbor_11.brotli
brotli --quality 11 --input $3/$1/$1_jsonMinify_qlogLookup.qlog --output $3/$1/$1_jsonMinify_qlogLookup_11.brotli
brotli --quality 11 --input $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor --output $3/$1/$1_jsonMinify_qlogLookup_qlogCbor_11.brotli
brotli --quality 11 --input $3/$1/$1_jsonMinify_qlogProtobuf.protobuf --output $3/$1/$1_jsonMinify_qlogProtobuf_11.brotli