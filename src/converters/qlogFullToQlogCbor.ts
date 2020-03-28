import * as qlog from "@quictools/qlog-schema";
import * as path from "path";
import {PCAPUtil} from "../util/PCAPUtil";
import { VantagePointType, EventField, EventCategory, TransportEventType, QuicFrame, QUICFrameTypeName, IAckFrame, IPaddingFrame, IPingFrame, IResetStreamFrame, IStopSendingFrame, ICryptoFrame, IStreamFrame, INewTokenFrame, IUnknownFrame, IMaxStreamDataFrame, IMaxStreamsFrame, IMaxDataFrame, IDataBlockedFrame, IStreamDataBlockedFrame, IStreamsBlockedFrame, INewConnectionIDFrame, IRetireConnectionIDFrame, IPathChallengeFrame, IPathResponseFrame, IConnectionCloseFrame, ErrorSpace, TransportError, ApplicationError, ConnectivityEventType, IEventSpinBitUpdated, IEventPacket, IEventPacketSent, ConnectionState, IEventTransportParametersSet, IEventConnectionStateUpdated, IDefaultEventFieldNames, CryptoError } from "@quictools/qlog-schema";
import { pathToFileURL } from "url";

import cbor from "cbor";

export class qlogFullToQlogCbor {

    public static async Convert(fileContents:string, filename: string):Promise<Buffer> {

        let stringLength = fileContents.length;

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogCbor( jsonContents, filename );

        const result = await converter.convert(stringLength);

        return result;
    }

    public static async Undo(fileContents:Buffer, filename: string):Promise<string> {

        let converter = new qlogFullToQlogCbor( fileContents, filename );

        const result = await converter.undo();

        return result;
    }

    public static async Compare(originalQlog:string, cborQlog:Buffer):Promise<boolean> {

        originalQlog = JSON.stringify( JSON.parse(originalQlog) ); // make sure its minified

        const converter = new qlogFullToQlogCbor( cborQlog, "" );
        let undone = await converter.undo();

        // let equal = converter.compare ( JSON.parse(originalQlog), JSON.parse(undone) ) ;

        // if ( /*!equal ||*/ originalQlog !== undone ) {
        //     console.error("cbor:compare: lengths were not equal", originalQlog.length, undone.length );
        // }
        
        return originalQlog === undone;
    }

    protected fileContents:any;
    protected filename:string;

    constructor(qlogTrace: any, filename: string) {
        this.fileContents = qlogTrace;
        this.filename = filename;
    }

    protected async convert(originalFileLength:number):Promise<Buffer> {

        let output:Buffer = Buffer.alloc(originalFileLength); // too big, but should be ok. If really a problem, do *0.8, as cbor is usually about 76% smaller

        let totalSize = 0;

        const enc = new cbor.Encoder()
        enc.on('data', (buf:Buffer) => { buf.copy(output, totalSize); totalSize += buf.length; } )
        enc.on('error', console.error)
        enc.on('finish', () => {})

        enc.end(this.fileContents);

        let encoded = output.slice(0, totalSize);

        // this runs of out memory -fast-, the above doesn't for some reason...
        // let encoded:Buffer = await cbor.encodeAsync(this.fileContents, {highWaterMark: originalFileLength});

        // console.log("CBOR size", encoded.length, originalFileLength, ((encoded.length / originalFileLength)* 100).toFixed(2) + "%" );

        output = encoded;


        return output;
    }

    protected async undo():Promise<string> {

        let output:string = "";

        let obj:any = {};

        const dec = new cbor.Decoder()
        dec.on('data', (something:any) => { obj = something; } )
        dec.on('error', console.error)
        dec.on('finish', () => {})

        dec.end(this.fileContents);

        output = JSON.stringify(obj);
        
        return output;
    }
}