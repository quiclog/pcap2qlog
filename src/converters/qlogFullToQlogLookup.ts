import * as qlog from "@quictools/qlog-schema";
import * as path from "path";
import {PCAPUtil} from "../util/PCAPUtil";
import { VantagePointType, EventField, EventCategory, TransportEventType, QuicFrame, QUICFrameTypeName, IAckFrame, IPaddingFrame, IPingFrame, IResetStreamFrame, IStopSendingFrame, ICryptoFrame, IStreamFrame, INewTokenFrame, IUnknownFrame, IMaxStreamDataFrame, IMaxStreamsFrame, IMaxDataFrame, IDataBlockedFrame, IStreamDataBlockedFrame, IStreamsBlockedFrame, INewConnectionIDFrame, IRetireConnectionIDFrame, IPathChallengeFrame, IPathResponseFrame, IConnectionCloseFrame, ErrorSpace, TransportError, ApplicationError, ConnectivityEventType, IEventSpinBitUpdated, IEventPacket, IEventPacketSent, ConnectionState, IEventTransportParametersSet, IEventConnectionStateUpdated, IDefaultEventFieldNames, CryptoError } from "@quictools/qlog-schema";
import { pathToFileURL } from "url";

export class qlogFullToQlogLookup {

    public static async Convert(fileContents:string, filename: string):Promise<Buffer|string> {

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogLookup( jsonContents, filename );

        const result = await converter.convert();

        return result;
    }

    public static async Undo(fileContents:string, filename: string):Promise<Buffer|string> {

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogLookup( jsonContents, filename );

        const result = await converter.undo();

        return result;
    }

    protected fileContents:any;
    protected filename:string;

    constructor(qlogTrace: any, filename: string) {
        this.fileContents = qlogTrace;
        this.filename = filename;
    }

    protected async convert():Promise<string> {

        const output:any = {};
        output.table = [];
        const lookupTable = output.table;

        const transform = (parent:any, key:any, el:any) => {

            // console.log("Transforming", parent, key, el);

            let newVal:any = undefined;

            if ( Array.isArray(el) ) {
                newVal = [];
                for ( const entry of el ) {
                    transform( newVal, "", entry );
                }
            }
            else if ( typeof el === "object" ) {
                newVal = {};
                const keys = Object.keys(el);
                for ( const key of keys ) {
                    transform( newVal, key, el[key] );
                }
            }
            else {
                // add actual data values to the lookuptable
                // only do this for strings. Numbers are suspected to have too much entropy to be worth it

                if ( typeof el !== "boolean" ) { // Number(true) === 1... (luckily Number("true") is NaN)
                    // qlog often encodes numbers as strings, messing quite a bit with our attempt at compression here
                    if ( !isNaN(Number( el )) ) { // Number is stricter than parseInt
                        el = Number( el );
                    }
                }

                if ( typeof el !== "number" ) {
                    const idx = lookupTable.indexOf(el);
                    if ( idx >= 0 ) {
                        newVal = idx;
                    }
                    else {
                        lookupTable.push( el );
                        newVal = lookupTable.length - 1;
                    }

                    newVal = "" + newVal;
                }
                else {
                    newVal = el;
                }
            }

            if ( Array.isArray(parent) ) {
                parent.push( newVal );
            }
            else {
                // add object keys to the lookuptable
                const idx = lookupTable.indexOf(key);
                if ( idx >= 0 ) {
                    key = idx;
                }
                else {
                    lookupTable.push( key );
                    key = lookupTable.length - 1;
                }

                parent[ key ] = newVal;
            }
        }

        // assume qlog files always are wrapped in {} and are not directly arrays
        const keys = Object.keys(this.fileContents);
        for ( const key of keys ) {
            transform ( output, key, this.fileContents[key] );
        }

        console.log("Converting qlogfile to lookup equivalent", this.filename );

        const output2 = JSON.stringify(output); //, null, 4);

        // console.log( JSON.stringify(this.fileContents, null, 4) );
        // console.log( output2 );

        return output2;
    }

    protected async undo():Promise<string> {

        const output:any = {};
        
        const lookupTable = this.fileContents.table;

        const transform = (parent:any, key:any, el:any) => {

            let newVal:any = undefined;

            if ( Array.isArray(el) ) {
                newVal = [];
                for ( const entry of el ) {
                    transform( newVal, "", entry );
                }
            }
            else if ( typeof el === "object" ) {
                newVal = {};
                const keys = Object.keys(el);
                for ( const key of keys ) {
                    transform( newVal, key, el[key] );
                }
            }
            else {
                // get actual data from the lookup table here

                if ( typeof el !== "number" ) {
                    newVal = lookupTable[ Number(el) ]; 
                    if ( newVal === undefined ) {
                        console.error("Something went wrong! index for value was not in lookuptable!", el );
                    }
                }
                else {
                    newVal = el;
                }
            }

            if ( Array.isArray(parent) ) {
                parent.push( newVal );
            }
            else {
                // get object keys from the lookuptable
                key = lookupTable[ Number(key) ]; 
                if ( key === undefined ) {
                    console.error("Something went wrong! index for key was not in lookuptable!", el );
                }

                parent[ key ] = newVal;
            }
        }

        // assume qlog files always are wrapped in {} and are not directly arrays
        const keys = Object.keys(this.fileContents);
        for ( const key of keys ) {
            if ( key !== "table" && key !== "lookup_table" ) {
                transform ( output, key, this.fileContents[key] );
            }
        }


        console.log("Converting lookup qlogfile to full equivalent", this.filename );

        const output2 = JSON.stringify(output); // , null, 4);

        // console.log( JSON.stringify(this.fileContents, null, 4) );
        // console.log("--------------------------------------");
        // console.log( output2 );

        return output2;
    }
}