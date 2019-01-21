import {ParserPCAP} from "./parsers/network/ParserPCAP";
import * as qlog from "@quictools/qlog-schema";
import {PCAPUtil} from "./spec/Draft-16/PCAPUtil";

let fs = require('fs');

// Parse CLI arguments
let args = require('minimist')(process.argv.slice(2));

// CLI arguments
let input_file: string = args.i;
let secrets_file: string = args.s;
let output_file: string = args.o;

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



