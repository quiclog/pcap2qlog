import {ParserPCAP} from "./parsers/network/ParserPCAP";
import * as qlog from "@quictools/qlog-schema";
import {PCAPUtil} from "./spec/Draft-16/PCAPUtil";

import * as fs from "fs";
import * as path from "path";

import {Downloader} from "./flow/downloader";
import { mkDirByPathSync } from "./util/FileUtil";
import {PCAPToJSON} from "./flow/pcaptojson";

// Parse CLI arguments
let args = require('minimist')(process.argv.slice(2));

// CLI arguments
// we expect the input file to be EITHER a JSON file of the format:
/*
    {
        "paths": [
            { "capture": "https://...", "secrets": "https://..." }
        ]
    }
*/
// then use the --list option
// OR a single file-path (or URL), with or without the secrets_file set
// then use the --input option 
// e.g., 
// node main.js --list=/allinone.json --output=/srv/qvis-cache
// OR
// node main.js --input=/decrypted.json  --output=/srv/qvis-cache
// OR
// node main.js --input=/encrypted.pcap --secrets=/secrets.keys  --output=/srv/qvis-cache
let input_list: string           = args.l || args.list;
let input_file: string           = args.i || args.input;
let secrets_file: string         = args.s || args.secrets;
let output_directory: string     = args.o || args.output    || "/srv/qvis-cache";

if( !input_file && !input_list ){
    console.error("No input file or list of files specified, use --input or --list");
    process.exit(1);
}

async function Flow() {

    let inputIsList:boolean = input_list !== undefined;

    // each session gets their own temporary input directory so we can easily remove it from disk after everything is done 
    let inputDirectory = path.resolve( output_directory + path.sep + "inputs" );
    inputDirectory += path.sep + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    mkDirByPathSync( inputDirectory );

    // 1. make single input format
    // we have 3 options:
    // a. it's a custom json file with many different input files (either .json or .pcap/pcapng) and possibly keys
    // b. it's just a single decrypted json file (tshark output)
    // c. it's just a single pcap or pcapng file and possibly a single key file
    // -> we rework b. and c. to the format of a. for easier manipulation later

    interface ICapture {
        capture_original:string; // for proper debugging
        capture:string;
        secrets_original?:string; // for proper debugging
        secrets?:string;
        error?:string;
    }

    let inputList:Array<ICapture> = [];

    if( !inputIsList ){
        if( input_file.indexOf(".json") >= 0 ){ // tshark json file
            inputList.push( {capture : input_file, capture_original: input_file } );
        }
        else{
            if( secrets_file )
                inputList.push( {capture : input_file, capture_original: input_file, secrets: secrets_file, secrets_original: secrets_file } );
            else
                inputList.push( {capture : input_file, capture_original: input_file } );
        }
    }
    else{
        let listLocalFilePath:string = await Downloader.DownloadIfRemote( input_list, inputDirectory );
        inputList = JSON.parse( fs.readFileSync( listLocalFilePath ).toString() ).paths;
        for( let capt of inputList ){
            capt.capture_original = capt.capture;
            capt.secrets_original = capt.secrets_original;
        }
    }

    // 2. now we have a nice list of files (possibly with secrets) that we would like to download
    // These files can either be local or remote, so we should always download them first if needed

    // TODO: we are relying A LOT on keeping the extensions on files intact for our logic
    // this can probably be done better, but that's just the way it is for now

    let download = async function(capt:ICapture, outputDirectory:string):Promise<ICapture> {
        //let output:ICapture = { capture: "", capture_original: capt.capture_original, secrets_original: capt.secrets_original };

        if( capt.error )
            return capt;

        let ext = path.extname(capt.capture); 
        if( !ext || ext.length == 0 ){
            capt.error = "Filepath did not contain an extension, this is required! " + capt.capture_original;
        }
        else{
            // we can't just throw errors, because that would fail the full Promise.all, 
            // while we just want to skip the files that don't work and show an error message
            try{
                capt.capture = await Downloader.DownloadIfRemote( capt.capture, inputDirectory );
            }
            catch(e){
                capt.error = e;
            }
            if( capt.secrets ){
                try{
                    capt.secrets = await Downloader.DownloadIfRemote( capt.secrets, inputDirectory );
                }
                catch(e){
                    capt.error = e;
                }
            }
        }

        return capt;
    };

    // note: we could do download + tshark calls in 1 long async function, but for clarity we keep them separate
    // performance should be relatively ok, unless there is a single file that is MUCH bigger than the rest of course
    let downloadPromises = []; 
    for( let capture of inputList ){
        downloadPromises.push( download(capture, inputDirectory) );
    }

    let downloadedFiles = await Promise.all( downloadPromises );


    // 3. now we have the files all local and the like
    // now we need to transform any pcap or pcapng files to the tshark json format
    let tshark = async function(capt:ICapture, outputDirectory:string):Promise<ICapture> {
        if( capt.error )
            return capt;

        if( path.extname(capt.capture) == ".json" || path.extname(capt.capture) == ".qlog" )
            return capt;

        // TODO: we explicitly do NOT check for .pcap or .pcapng here to allow for most flexibility
        // this may come back to bite us in the *ss later
        
        capt.capture = await PCAPToJSON.TransformToJSON( capt.capture, inputDirectory, capt.secrets );

        return capt;
    };

    let tsharkPromises = []; 
    for( let capture of downloadedFiles ){
        tsharkPromises.push( tshark(capture, inputDirectory) );
    }

    let tsharkFiles = await Promise.all( tsharkPromises );


    console.log("Input list : ", inputList);
    console.log("Downloaded files : ", downloadedFiles);
    console.log("Transformed files : ", tsharkFiles);

    process.exit(0);
};

Flow().then( () => {
    console.log("Executing fully done");
}).catch( (reason) => {
    console.error("Top level error " + reason);
});

/*
process.exit(2);



// 1. figure out which kind of input file we have
let inputExt = path.extname(input_file);
if( inputExt == "json" ){
    fs.readFileSync("../" + input_file).toString()
}

// Determine file extension
let input_file_extension: string = input_file.substr(input_file.lastIndexOf('.') + 1);


if (input_file_extension === "json") {
    // JSON flow


    let jsonTrace = JSON.parse(fs.readFileSync("../" + input_file).toString())
    // I don't like this. Should make better
    let pcapParser: ParserPCAP = new ParserPCAP(jsonTrace);

    let myQLogConnection: qlog.IConnection;
    myQLogConnection = {
        quic_version: pcapParser.getQUICVersion(),
        vantagepoint: qlog.VantagePoint.NETWORK,
        connectionid: pcapParser.getConnectionID(),
        starttime: pcapParser.getStartTime(),
        fields: ["time", "category", "type", "trigger", "data"],
        events: []
    };

    // First event = new connection
    myQLogConnection.events.push([
        0,
        qlog.EventCategory.CONNECTIVITY,
        qlog.ConnectivityEventType.NEW_CONNECTION,
        qlog.ConnectivityEventTrigger.LINE,
        pcapParser.getConnectionInfo() as qlog.IEventNewConnection
    ]);

    //TODO keys

    for (let x of jsonTrace) {
        let frame = x['_source']['layers']['frame'];
        let quic = x['_source']['layers']['quic'];

        let time = parseFloat(frame['frame.time_epoch']);
        let time_relative: number = Math.round((time - myQLogConnection.starttime) * 1000);

        let header = {} as qlog.IPacketHeader;

        if (quic['quic.header_form'] == '1') // LONG header
        {
            header.form = 'long';
            header.type = PCAPUtil.getPacketType(quic['quic.long.packet_type']);
            header.version = quic['quic.version'];
            header.scid = quic['quic.scid'].replace(/:/g, '');
            header.dcid = quic['quic.dcid'].replace(/:/g, '');
            header.scil = quic['quic.scil'].replace(/:/g, '');
            header.dcil = quic['quic.dcil'].replace(/:/g, '');
            header.payload_length = quic['quic.length'];
            header.packet_number = quic['quic.packet_number_full'];
        }
        else {
            header.form = 'short';
            header.dcid = quic['quic.dcid'].replace(/:/g, '');
            header.payload_length = 0; // TODO!
            header.packet_number = quic['quic.packet_number_full'];
        }

        let entry: any = {
            raw_encrypted: "TODO",
            header: header,
        };

        let keys = Object.keys(quic['quic.frame']);
        let tmp: any = {};
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j].replace(/^quic\./, "");
            tmp[key] = quic['quic.frame'][keys[j]];
        }


        tmp['frame_type'] = PCAPUtil.getFrameTypeName(tmp['frame_type']);

        entry.frames = [];
        entry.frames.push(tmp);

        x = [] as qlog.IEventPacketRX;


        myQLogConnection.events.push([
            time_relative,
            qlog.EventCategory.TRANSPORT,
            qlog.TransportEventType.TRANSPORT_PACKET_RX,
            qlog.TransporEventTrigger.LINE,
            entry
        ]);
    }

    let myQLog: qlog.IQLog;
    myQLog = {
        qlog_version: "0.1",
        description: input_file,
        connections: [myQLogConnection]
    };

    //TODO write to file
    console.log(JSON.stringify(myQLog, null, 4));

    fs.writeFileSync("20181219_handshake_v6_quicker.edm.uhasselt.be.qlog", JSON.stringify(myQLog, null, 4));
}
else if (input_file_extension === "pcap" || input_file_extension === "pcapng") {
    // PCAP(NG) flow
    // - encrypted PCAP?
    // -- supply secret
    // -> decrypted PCAP
    // -- run tshark
    // -- goto JSON flow

}


*/