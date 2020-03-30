#!/bin/bash

# e.g.,  in the root dir, call   ./src/scripts/comparisons/compare.sh FILE /srv/binary/input /srv/binary/output  (note: FILE without the .qlog extension!)
# e.g., ./src/scripts/comparisons/compare.sh large /home/rmarx/WORK/binary/input /home/rmarx/WORK/binary/output

# https://medium.com/@vuongtran/how-to-solve-process-out-of-memory-in-node-js-5f0de8f8464c

mkdir $3/$1
node out/main.js --max-old-space-size=5120 --mode=jsonMinify --input=$2/$1.qlog --output=$3/$1

node out/main.js --max-old-space-size=5120 --mode=qlogLookup --input=$3/$1/$1_jsonMinify.qlog --output=$3/$1
node out/main.js --max-old-space-size=5120 --mode=qlogCbor --input=$3/$1/$1_jsonMinify.qlog --output=$3/$1
node out/main.js --max-old-space-size=5120 --mode=qlogCbor --input=$3/$1/$1_jsonMinify_qlogLookup.qlog --output=$3/$1
node out/main.js --max-old-space-size=5120 --mode=qlogProtobuf --input=$3/$1/$1_jsonMinify.qlog --output=$3/$1

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

brotli --quality=4 --output=$3/$1/$1_jsonMinify_4.brotli $3/$1/$1_jsonMinify.qlog
brotli --quality=4 --output=$3/$1/$1_jsonMinify_qlogCbor_4.brotli $3/$1/$1_jsonMinify_qlogCbor.cbor
brotli --quality=4 --output=$3/$1/$1_jsonMinify_qlogLookup_4.brotli $3/$1/$1_jsonMinify_qlogLookup.qlog
brotli --quality=4 --output=$3/$1/$1_jsonMinify_qlogLookup_qlogCbor_4.brotli $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor
brotli --quality=4 --output=$3/$1/$1_jsonMinify_qlogProtobuf_4.brotli $3/$1/$1_jsonMinify_qlogProtobuf.protobuf

echo "Compressing with brotli 11"

brotli --quality=11 --output=$3/$1/$1_jsonMinify_11.brotli $3/$1/$1_jsonMinify.qlog
brotli --quality=11 --output=$3/$1/$1_jsonMinify_qlogCbor_11.brotli $3/$1/$1_jsonMinify_qlogCbor.cbor
brotli --quality=11 --output=$3/$1/$1_jsonMinify_qlogLookup_11.brotli $3/$1/$1_jsonMinify_qlogLookup.qlog
brotli --quality=11 --output=$3/$1/$1_jsonMinify_qlogLookup_qlogCbor_11.brotli $3/$1/$1_jsonMinify_qlogLookup_qlogCbor.cbor
brotli --quality=11 --output=$3/$1/$1_jsonMinify_qlogProtobuf_11.brotli $3/$1/$1_jsonMinify_qlogProtobuf.protobuf