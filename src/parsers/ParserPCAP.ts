import * as qlog from "@quictools/qlog-schema";
import {PCAPUtil} from "../spec/Draft-16/PCAPUtil";

export class ParserPCAP {

    constructor(private jsonTrace: any) {

    }

    public static Parse(jsonContents:any, secretsContents:any):qlog.IQLog {
        let pcapParser = new ParserPCAP( jsonContents );

        // FIXME: we assume now that each input file only contains a single QUIC connection
        // in reality, they could potentially contain more, so we should support that in the future! 
        // Or at least check for it... there is a "connectionNr" field in there somewhere 
        let connection: qlog.IConnection;
        connection = {
            quic_version: pcapParser.getQUICVersion(),
            vantagepoint: qlog.VantagePoint.NETWORK,
            connectionid: pcapParser.getConnectionID(),
            starttime: pcapParser.getStartTime(),
            fields: ["time", "category", "type", "trigger", "data"],
            events: []
        };
    
        // First event = new connection
        connection.events.push([
            0,
            qlog.EventCategory.CONNECTIVITY,
            qlog.ConnectivityEventType.NEW_CONNECTION,
            qlog.ConnectivityEventTrigger.LINE,
            pcapParser.getConnectionInfo() as qlog.IEventNewConnection
        ]);
    
        if( secretsContents ){
            //TODO: add keys to the qlog output (if available)
        }
    
        for ( let x of jsonContents ) {
            let frame = x['_source']['layers']['frame'];
            let quic = x['_source']['layers']['quic'];
    
            let time = parseFloat(frame['frame.time_epoch']);
            let time_relative: number = Math.round((time - connection.starttime) * 1000);
    
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
    
            //x = [] as qlog.IEventPacketRX;
    
    
            connection.events.push([
                time_relative,
                qlog.EventCategory.TRANSPORT,
                qlog.TransportEventType.TRANSPORT_PACKET_RX,
                qlog.TransporEventTrigger.LINE,
                entry
            ]);
        }
    

        let output: qlog.IQLog;
        output = {
            qlog_version: "0.1",
            description: "TODO: SET",
            connections: [connection]
        };

        return output;
    }

    public getQUICVersion(): string {
        // Loop all packets, return as soon as a version is found
        for (let x of this.jsonTrace) {
            let quic = x['_source']['layers']['quic'];
            // Only long headers contain version
            if (quic['quic.header_form'] === '1') {
                return quic['quic.version'];
            }
        }

        return 'None';
    }

    public getConnectionID(): string {
        return this.jsonTrace[0]['_source']['layers']['quic']['quic.scid'].replace(/:/g, '');
    }

    public getStartTime(): number {
        return parseFloat(this.jsonTrace[0]['_source']['layers']['frame']['frame.time_epoch']);
    }

    public getConnectionInfo() {
        let layer_ip = this.jsonTrace[0]['_source']['layers']['ip'];
        let layer_udp = this.jsonTrace[0]['_source']['layers']['udp'];

        if(!layer_ip) {
            layer_ip = this.jsonTrace[0]['_source']['layers']['ipv6'];
            return {
                ip_version: layer_ip['ipv6.version'],
                srcip: layer_ip['ipv6.src'],
                dstip: layer_ip['ipv6.dst'],
                srcport: layer_udp['udp.srcport'],
                dstport: layer_udp['udp.dstport'],
            }
        }




        return {
            ip_version: layer_ip['ip.version'],
            srcip: layer_ip['ip.src'],
            dstip: layer_ip['ip.dst'],
            srcport: layer_udp['udp.srcport'],
            dstport: layer_udp['udp.dstport'],
        }
    }

}