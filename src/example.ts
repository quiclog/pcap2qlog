import {IEventNewConnection, IEventPacketRX, IQLog, IQLogEvent, VantagePoint} from "./spec/Draft-16/QLog";

var myQLog: IQLog;
myQLog = {
    quic_version: "",
    qlog_version: "",
    vantagepoint: VantagePoint.NETWORK,
    connectionid: "",
    starttime: 0,
    fields: ["time", "category", "type", "trigger", "data"],
    events: []
};

var newConnectionEvent: IQLogEvent = {
    time: 0,
    category: "CONNECTIVITY",
    type: "NEW CONNECTION",
    trigger: "LINE",
    data: {
        ip_version: '4',
        srcip: "127.0.0.1",
        dstip: "127.0.0.2",
        srcport: 56411,
        dstport: 4433
    } as IEventNewConnection
};


var rxEvent: IQLogEvent = {
    time: 0,
    category: "TRANSPORT",
    type: "PACKET_RX",
    trigger: "LINE",
    data: {
        raw_encrypted: "0xfsdfsdf7sdf"
    } as IEventPacketRX
};

myQLog.events.push(newConnectionEvent);
myQLog.events.push(rxEvent);

console.log(JSON.stringify(myQLog, null, 4));