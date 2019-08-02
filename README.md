# pcap2qlog
A tool to convert .pcap and .pcapng files into qlog files

# Installation

Disclaimer: this tool has only been tested on Linux, other operating systems might work but installation and usage can differ from this guide.

## Prerequisites

- Git
- NodeJS
- Wireshark / TShark version 3.1.1

## Building Wireshark from source

Before we can use TShark, we first have to build a version of Wireshark which has support for QUIC draft-22. This guide uses version 3.1.1 of Wireshark as the tool has been tested to work for that version. Instructions for building this specific version of Wireshark can be found here: https://github.com/quiclog/qvis-server/blob/master/system/docker_setup/wireshark/dockerfile.

## Setting up the NodeJS project

Start by cloning the repository to your local machine and entering the cloned directory.

```sh
git clone https://github.com/quiclog/pcap2qlog
cd pcap2qlog
```

Run the following commands to set up the NodeJS project and compile the TypeScript code to JavaScript which can then be run by NodeJS:

```sh
npm install
npx tsc
```

# Usage

Both Wireshark and pcap2qlog should now be ready to use. The tool can be used for either converting pcap(ng) files directly to qlog or it can convert JSON files produced by TShark to Qlog.

```
PCAP(NG) -> JSON (produced by TShark) -> Qlog
```

The program internally uses TShark for the conversion of pcap to JSON so it is necessary to pass its path to the tool.

After compiling the TypeScript code, the tool can be executed as follows (assuming you are in the root directory of the project):

```sh
node out/main.js
```

## Options:

```
--tshark=/path/to/tshark, -t /path/to/tshark
        Points the tool to your local installation path of tshark
        Defaults to /wireshark/run/tshark when omitted

--list=/path/to/list.json, -l /path/to/list.json
        Path to a file containing a list of traces which will converted to a single qlog file
        The input file should have a structure along the lines of the following:
        {
            "description": "top-level description",
            "paths": [
                { "capture": "https://...", "secrets": "https://...", "description" : "per-file desc" },
                ...
            ]
        }

--input=/path/to/input.(pcap | json), -i /path/to/input.(pcap | json)
        Path or url to a single trace in either pcap format or JSON format
        JSON files are assumed to be decrypted while PCAP files are assumed to encrypted
        The --secrets flag should therefore be set when passing pcap files

--secrets=/path/to/secrets.keys, -s /path/to/secrets
        Path to the secrets file which has to be used to decrypt the pcap given using the --input flag
```

NOTE: This tool can also be used to merge together multiple (partial) qlog files. To do this, just pass the files with the --list option.

## Examples

```sh
# Using a list of traces
node out/main.js --list=/allinone.json --output=/output_dir --tshark=/path/to/tshark

# Tshark is not used if the input is already in the decrypted JSON format
node out/main.js --input=/decrypted.json  --output=/output_dir

# When an encrypted pcap is given, both the secrets file and the tshark executable should be given
node out/main.js --input=/encrypted.pcap --secrets=/secrets.keys  --output=/output_dir --tshark=/path/to/tshark
```