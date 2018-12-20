import {ParserPCAP} from "./parsers/network/ParserPCAP";
import {IEventNewConnection, IQLog, IQLogEvent, VantagePoint} from "./spec/Draft-16/QLog";

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


    let myQLog: IQLog;
    myQLog = {
        quic_version: pcapParser.getQUICVersion(),
        qlog_version: "0.1",
        vantagepoint: VantagePoint.NETWORK,
        connectionid: pcapParser.getConnectionID(),
        starttime: pcapParser.getStartTime(),
        fields: ["time", "category", "type", "trigger", "data"],
        events: []
    };

    // First event = new connection
    myQLog.events.push([
        0,
        "CONNECTIVITY",
        "NEW CONNECTION",
        "LINE",
        pcapParser.getConnectionInfo() as IEventNewConnection
    ]);

    // TODO rest of packets maybe, no? yes!


    //TODO write to file
    console.log(JSON.stringify(myQLog, null, 4));
}
else if (input_file_extension === "pcap" || input_file_extension === "pcapng") {
    // PCAP(NG) flow
    // - encrypted PCAP?
    // -- supply secret
    // -> decrypted PCAP
    // -- run tshark
    // -- goto JSON flow

}



