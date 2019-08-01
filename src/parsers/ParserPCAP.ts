import * as qlog from "@quictools/qlog-schema";
import {PCAPUtil} from "../util/PCAPUtil";
import { VantagePointType, EventField, EventCategory, TransportEventType, QuicFrame, QUICFrameTypeName, IAckFrame, IPaddingFrame, IPingFrame, IResetStreamFrame, IStopSendingFrame, ICryptoFrame, IStreamFrame, INewTokenFrame, IUnknownFrame, IMaxStreamDataFrame, IMaxStreamsFrame, IMaxDataFrame, IDataBlockedFrame, IStreamDataBlockedFrame, IStreamsBlockedFrame, INewConnectionIDFrame, IRetireConnectionIDFrame, IPathChallengeFrame, IPathResponseFrame, IConnectionCloseFrame, ErrorSpace, TransportError, ApplicationError, ConnectivityEventType, IEventSpinBitUpdate, ConnectivityEventTrigger, IEventPacketSent, IEventConnectionClose, IALPNUpdate } from "@quictools/qlog-schema";

export class ParserPCAP {
        public clientCID: string;
        public clientPermittedCIDs: Set<string> = new Set<string>(); // New connection ids the client is permitted to use, communicated using NEW_CONNECTION_ID frames from server to client
        public serverCID: string;
        public serverPermittedCIDs: Set<string> = new Set<string>(); // New connection ids the server is permitted to use, communicated using NEW_CONNECTION_ID frames from client to server
        public ODCID: string; // Original destination conn id
        public serverCIDChanged: boolean = false;; // Flip after initial change

        public trace: qlog.ITrace;
        private trailingEvents: EventField[][] = [];

        public spinbit: boolean = false;
        public currentVersion: string;
        public selectedALPN: string = "";

        constructor(private jsonTrace: any) {
            this.clientCID = jsonTrace[0]["_source"]["layers"]["quic"]["quic.scid"].replace(/:/g, ''); // Can change later
            this.serverCID = jsonTrace[0]["_source"]["layers"]["quic"]["quic.dcid"].replace(/:/g, ''); // Must change in handshake, can change later as well
            this.ODCID = this.serverCID;
            this.currentVersion = jsonTrace[0]["_source"]["layers"]["quic"]["quic.version"];

            // FIXME: we assume now that each input file only contains a single QUIC connection
            // in reality, they could potentially contain more, so we should support that in the future!
            // Or at least check for it... there is a "connectionNr" field in there somewhere
            this.trace = {
                vantagepoint: {
                    name: "TODO",
                    type: VantagePointType.network,
                    flow: VantagePointType.client, // Perspective from which the trace is made, e.g. packet_sent from flow=client means that the client has sent a packet while packet_sent from flow=server means that the server sent it.
                },
                configuration: {
                    time_offset: "0",
                    time_units: "ms",
                    original_uris: [], // TODO
                },
                common_fields: {
                    group_id: this.getConnectionID(), // Original destination connection id
                    // group_ids: ,
                    protocol_type: "QUIC",
                    reference_time: this.getStartTime().toString(),
                },
                event_fields: ["relative_time", "category", "event", "trigger", "data"],
                events: []
            };

            // First event = new connection
            this.addEvent([
                "0",
                qlog.EventCategory.connectivity,
                qlog.ConnectivityEventType.connection_new,
                qlog.ConnectivityEventTrigger.line,
                this.getConnectionInfo() as qlog.IEventConnectionNew,
            ]);
        }

        // Adds an event to the list of events
        // Also appends all trailing events immediately after the new event (see addTrailingEvents() function for more details)
        public addEvent(event: EventField[]) {
            this.trace.events.push(event);
            this.trace.events = this.trace.events.concat(this.trailingEvents);
            this.trailingEvents = [];
        }

        // Adds an event to a queue which will be added to the event list after the next main event
        // Uses:
        //  Say we have a connection close event and a packet received event containing the connection close frame
        //  The logical order to log these events is to log the packet received event before the connection close event
        //  This is however not always easy as the connection close event is discovered before the packet received event is fully completed
        // Therefore one is able to queue the connection close event first by calling addTrailingEvent(connectionCloseEvent) first when the connection close frame is discovered and later calling addEvent(packetReceivedEvent) when the packet received event is ready while still maintaining the expected order of events
        public addTrailingEvent(event: EventField[]) {
            this.trailingEvents.push(event);
        }

        // Updates the server's CID after its initial response
        public checkInitialServerCIDUpdate(scid: string, dcid: string, relativeTime: string) {
            // In the server's first response, the conn id should be changed
            if (this.serverCIDChanged === false && dcid === this.clientCID) {
                this.serverCIDChanged = true;
                // Create an event that the connection id has changed
                this.addEvent([
                    relativeTime,
                    qlog.EventCategory.connectivity,
                    qlog.ConnectivityEventType.connection_id_update,
                    qlog.ConnectivityEventTrigger.line,
                    {
                        dst_old: this.serverCID,
                        dst_new: scid,
                    } as qlog.IEventConnectionIDUpdate,
                ]);
                this.serverCID = scid;
            }
        }

        // Checks if a CID is in the pool of permitted CIDs for either server or client
        // If so, CID for that endpoint must have changed to the new one
        public checkCIDUpdate(cid: string, relativeTime: string) {
            // Client conn id must have changed if the CID is in its pool of permitted CIDs
            if (this.clientPermittedCIDs.has(cid)) {
                this.addEvent([ // Log the change of cid
                    relativeTime,
                    qlog.EventCategory.connectivity,
                    qlog.ConnectivityEventType.connection_id_update,
                    qlog.ConnectivityEventTrigger.line,
                    {
                        src_old: this.clientCID,
                        src_new: cid,
                    } as qlog.IEventConnectionIDUpdate,
                ]);
                this.clientCID = cid;
                this.clientPermittedCIDs.delete(cid);
            }
            // Server connection id must have changed if the CID is in its pool of permitted CIDs
            else if (this.serverPermittedCIDs.has(cid)) {
                // Create an event that the connection id has changed
                this.addEvent([
                    relativeTime,
                    qlog.EventCategory.connectivity,
                    qlog.ConnectivityEventType.connection_id_update,
                    qlog.ConnectivityEventTrigger.line,
                    {
                        dst_old: this.serverCID,
                        dst_new: cid,
                    } as qlog.IEventConnectionIDUpdate,
                ]);
                this.serverCID = cid;
                this.serverPermittedCIDs.delete(cid);
            }
        }

        public addNewCID(dcid: string, newCID: string) {
            // Checks the dcid to see who the new CID will belong to and adds it to that endpoint's pool
            // Also logs the new connection id event
            if (this.clientCID === dcid || this.clientPermittedCIDs.has(dcid)) {
                this.clientPermittedCIDs.add(newCID);
            } else if (this.serverCID === dcid || this.serverPermittedCIDs.has(dcid)) {
                this.serverPermittedCIDs.add(newCID);
            } else {
                throw new Error("DCID of QUIC packet belongs to neither client nor server");
            }
        }

        public checkSpinBitUpdate(spinbit: string, relativeTime: string) {
            const spinbitBool: boolean = spinbit === "1";
            if (this.spinbit !== spinbitBool) {
                this.spinbit = spinbitBool;
                this.addEvent([
                    relativeTime,
                    EventCategory.connectivity,
                    ConnectivityEventType.spin_bit_update,
                    ConnectivityEventTrigger.line,
                    {
                        state: spinbitBool,
                    } as IEventSpinBitUpdate,
                ]);
            }
        }

        public static Parse(jsonContents:any, secretsContents:any):qlog.IQLog {
            let pcapParser = new ParserPCAP( jsonContents );

            if( secretsContents ){
                //TODO: add keys to the qlog output (if available)
            }

            for ( let packet of jsonContents ) {
                let frame = packet['_source']['layers']['frame'];
                let quic = packet['_source']['layers']['quic'];

                let time = parseFloat(frame['frame.time_epoch']);
                let time_relative: number = pcapParser.trace.common_fields !== undefined && pcapParser.trace.common_fields.reference_time !== undefined ? Math.round((time - parseFloat(pcapParser.trace.common_fields.reference_time)) * 1000) : -1;

                let header = {} as qlog.IPacketHeader;

                function extractEventsFromPacket(jsonPacket:any) {
                    if (jsonPacket['quic.header_form'] == '1') // LONG header
                    {
                        header.form = 'long';
                        header.version = jsonPacket['quic.version'];
                        header.scid = jsonPacket["quic.scid"].replace(/:/g, '');
                        header.dcid = jsonPacket["quic.dcid"].replace(/:/g, '');
                        header.scil = jsonPacket['quic.scil'].replace(/:/g, '');
                        header.dcil = jsonPacket['quic.dcil'].replace(/:/g, '');
                        header.payload_length = jsonPacket['quic.length'];
                        header.packet_number = jsonPacket['quic.packet_number_full'];
                    }
                    else {
                        header.form = 'short';
                        header.dcid = jsonPacket['quic.dcid'].replace(/:/g, '');
                        header.payload_length = jsonPacket['quic.protected_payload'].replace(/:/g, '').length / 2;
                        header.packet_number = jsonPacket['quic.packet_number_full'];
                    }

                    const isVersionNegotation: boolean = header.version !== undefined ? parseInt(header.version, 16) === 0x00 : false;

                    // Both IEventPacketSent and IEventPacketReceived have the same structure so we just use one of the two for type checking
                    const entry: IEventPacketSent = {
                        type: header.form === "long" ? (isVersionNegotation ? qlog.PacketType.version_negotation : PCAPUtil.getPacketType(parseInt(jsonPacket['quic.long.packet_type']))) : qlog.PacketType.onertt,
                        header: header,
                    };

                    entry.frames = [];

                    // If there are multiple quic frames, extract data from each of them. If there is only a single frame quic.frame will be an object instead of an array
                    if (Array.isArray(jsonPacket["quic.frame"])) {
                        for (const frame of jsonPacket["quic.frame"]) {
                            entry.frames.push(ParserPCAP.extractQlogFrame(frame, pcapParser, header.dcid, time_relative.toString()));
                        }
                    } else if (jsonPacket["quic.frame"] !== undefined) {
                        entry.frames.push(ParserPCAP.extractQlogFrame(jsonPacket["quic.frame"], pcapParser, header.dcid, time_relative.toString()));
                    }

                    //x = [] as qlog.IEventPacketRX;

                    const transportEventType: TransportEventType = pcapParser.clientCID !== jsonPacket["quic.dcid"].replace(/:/g, '') ? TransportEventType.packet_sent : TransportEventType.packet_received;

                    pcapParser.addEvent([
                        time_relative.toString(),
                        EventCategory.transport,
                        transportEventType,
                        qlog.TransporEventTrigger.line,
                        entry
                    ]);

                    if (header.form === "long") {
                        if (header.version !== pcapParser.currentVersion && header.version !== undefined && parseInt(header.version, 16) !== 0) {
                            pcapParser.addEvent([
                                time_relative.toString(),
                                EventCategory.transport,
                                TransportEventType.version_update,
                                qlog.TransporEventTrigger.line,
                                {
                                    old: pcapParser.currentVersion,
                                    new: header.version,
                                } as qlog.IEventVersionUpdate
                            ]);
                            pcapParser.currentVersion = header.version;
                        }
                    } else if (header.form === "short") {
                        pcapParser.checkSpinBitUpdate(jsonPacket["quic.spin_bit"], time_relative.toString());
                    }
                }

                // "quic" property is either an object containing the data of a single quic packet or an array containing the data of multiple quic packets coalesced into one datagram
                if (Array.isArray(quic)) {
                    for (const packet of quic) {
                        extractEventsFromPacket(packet);
                        const scid: string | undefined = (packet["quic.scid"]) ? packet["quic.scid"].replace(/:/g, '') : undefined; // Short form headers don't have a scid field
                        const dcid: string = packet["quic.dcid"].replace(/:/g, '');

                        if (scid !== undefined) {
                            pcapParser.checkInitialServerCIDUpdate(scid, dcid, time_relative.toString());

                            pcapParser.checkCIDUpdate(scid, time_relative.toString());
                        }

                        pcapParser.checkCIDUpdate(dcid, time_relative.toString());
                    }
                } else {
                    extractEventsFromPacket(quic);
                    const scid: string | undefined = (quic["quic.scid"]) ? quic["quic.scid"].replace(/:/g, '') : undefined;
                    const dcid: string = quic["quic.dcid"].replace(/:/g, '');

                    if (scid !== undefined) {
                        pcapParser.checkInitialServerCIDUpdate(scid, dcid, time_relative.toString());

                        pcapParser.checkCIDUpdate(scid, time_relative.toString());
                    }

                    pcapParser.checkCIDUpdate(dcid, time_relative.toString());
                }
            }

            let output: qlog.IQLog;
            output = {
                qlog_version: "draft-01",
                description: "TODO: SET",
                traces: [pcapParser.trace]
            };

            return output;
        }

        private static extractALPNs(tsharkTLSHandshake: any): string[] {
            let alpnKey = undefined;
            for (const key of Object.keys(tsharkTLSHandshake)) {
                if (key.indexOf("protocol_negotiation") >= 0) {
                    alpnKey = key;
                    break;
                }
            }
            if (alpnKey !== undefined) {
                const alpnList = tsharkTLSHandshake[alpnKey]["tls.handshake.extensions_alpn_list"];
                if (Array.isArray(alpnList)) {
                    return alpnList.map((entry) => {
                        return entry["tls.handshake.extensions_alpn_str"];
                    });
                }
                else {
                    return [alpnList["tls.handshake.extensions_alpn_str"]];
                }
            }
            else {
                return [];
            }
        }

        public static findALPNs(tsharkCryptoFrame: any): string[] {
            if (tsharkCryptoFrame["tls.handshake"] === undefined) {
                return [];
            } else if (typeof tsharkCryptoFrame["tls.handshake"] === "string") {
                return [];
            } else if (Array.isArray(tsharkCryptoFrame["tls.handshake"])) {
                let alpns: string[] = [];
                for (const handshakeFrame of tsharkCryptoFrame["tls.handshake"]) {
                    alpns = alpns.concat(this.extractALPNs(handshakeFrame));
                }
                return alpns;
            } else {
                return this.extractALPNs(tsharkCryptoFrame["tls.handshake"]);
            }
        }

        // TODO move to util file
        public static extractQlogFrame(tsharkFrame: any, parser: ParserPCAP, dcid: string, relativeTime: string): QuicFrame {
            const frameType = PCAPUtil.getFrameTypeName(parseInt(tsharkFrame["quic.frame_type"]));
            const scid: string = dcid === parser.clientCID ? parser.serverCID : parser.clientCID;

            switch (frameType) {
                case QUICFrameTypeName.padding:
                    return this.convertPaddingFrame(tsharkFrame);
                case QUICFrameTypeName.ping:
                    return this.convertPingFrame(tsharkFrame);
                case QUICFrameTypeName.ack:
                    return this.convertAckFrame(tsharkFrame);
                case QUICFrameTypeName.reset_stream:
                    return this.convertResetStreamFrame(tsharkFrame);
                case QUICFrameTypeName.stop_sending:
                    return this.convertStopSendingFrame(tsharkFrame);
                case QUICFrameTypeName.crypto:
                    const alpns: string[] = this.findALPNs(tsharkFrame);

                    // ALPN can only be selected by server
                    if (alpns.length === 1 && (dcid === parser.clientCID || parser.clientPermittedCIDs.has(dcid))) {
                        parser.addTrailingEvent([
                            relativeTime,
                            EventCategory.transport,
                            TransportEventType.alpn_update,
                            {
                                old: parser.selectedALPN,
                                new: alpns[0],
                            } as IALPNUpdate,     
                        ]);
                        parser.selectedALPN = alpns[0];
                    }
                    return this.convertCryptoFrame(tsharkFrame);
                case QUICFrameTypeName.new_token:
                    return this.convertNewTokenFrame(tsharkFrame);
                case QUICFrameTypeName.stream:
                    return this.convertStreamFrame(tsharkFrame);
                case QUICFrameTypeName.max_data:
                    return this.convertMaxDataFrame(tsharkFrame);
                case QUICFrameTypeName.max_stream_data:
                    return this.convertMaxStreamDataFrame(tsharkFrame);
                case QUICFrameTypeName.max_streams:
                    return this.convertMaxStreamsFrame(tsharkFrame);
                case QUICFrameTypeName.stream_data_blocked:
                    return this.convertStreamDataBlockedFrame(tsharkFrame);
                case QUICFrameTypeName.streams_blocked:
                    return this.convertStreamsBlockedFrame(tsharkFrame);
                case QUICFrameTypeName.new_connection_id:
                    const frame = this.convertNewConnectionIDFrame(tsharkFrame);
                    parser.addNewCID(dcid, frame.connection_id);
                    return frame;
                case QUICFrameTypeName.retire_connection_id:
                    return this.convertRetireConnectionIDFrame(tsharkFrame);
                case QUICFrameTypeName.path_challenge:
                    return this.convertPathChallengeFrame(tsharkFrame);
                case QUICFrameTypeName.path_response:
                    return this.convertPathResponseFrame(tsharkFrame);
                case QUICFrameTypeName.connection_close:
                    // Event should only be added after PacketReceived/PacketSent event
                    parser.addTrailingEvent([
                        relativeTime,
                        EventCategory.connectivity,
                        ConnectivityEventType.connection_close,
                        {
                            src_id: scid
                        } as IEventConnectionClose,
                    ]);
                    return this.convertConnectionCloseFrame(tsharkFrame);
                default:
                    return {
                        frame_type: QUICFrameTypeName.unknown_frame_type,
                        raw_frame_type: tsharkFrame["quic.frame_type"],
                    } as IUnknownFrame;
            }
        }

        public static convertPaddingFrame(tsharkPaddingFrame: any): IPaddingFrame {
            return {
                frame_type: QUICFrameTypeName.padding,
            };
        }

        public static convertPingFrame(tsharkPingFrame: any): IPingFrame {
            return {
                frame_type: QUICFrameTypeName.ping,
            };
        }

        public static convertAckFrame(tsharkAckFrame: any): IAckFrame {
            const isEcn: boolean = tsharkAckFrame["quic.frame_type"] === "3" ? true : false;
            return {
                frame_type: QUICFrameTypeName.ack,
                ack_delay: tsharkAckFrame["quic.ack.ack_delay"],
                acked_ranges: [[tsharkAckFrame["quic.ack.first_ack_range"], tsharkAckFrame["quic.ack.largest_acknowledged"]]],
                ce: isEcn ? tsharkAckFrame["quic.ack.ecn_ce_count"] : undefined,
                ect0: isEcn ? tsharkAckFrame["quic.ack.ect0_count"] : undefined,
                ect1: isEcn ? tsharkAckFrame["quic.ack.ect1_count"] : undefined,
            };
        }

        public static convertResetStreamFrame(tsharkResetStreamFrame: any): IResetStreamFrame {
            return {
                frame_type: QUICFrameTypeName.reset_stream,

                id: tsharkResetStreamFrame["quic.rsts.stream_id"],
                error_code: tsharkResetStreamFrame["quic.rsts.application_error_code"],
                final_size: tsharkResetStreamFrame["quic.rsts.final_size"],
            }
        }

        public static convertStopSendingFrame(tsharkStopSendingFrame: any): IStopSendingFrame {
            return {
                frame_type: QUICFrameTypeName.stop_sending,

                id: tsharkStopSendingFrame["quic.ss.stream_id"],
                error_code: tsharkStopSendingFrame["quic.ss.application_error_code"],
            };
        }

        public static convertCryptoFrame(tsharkCryptoFrame: any): ICryptoFrame {
            return {
                frame_type: QUICFrameTypeName.crypto,

                offset: tsharkCryptoFrame["quic.crypto.offset"],
                length: tsharkCryptoFrame["quic.crypto.length"],
            };
        }

        public static convertNewTokenFrame(tsharkNewTokenFrame: any): INewTokenFrame {
            return {
                frame_type: QUICFrameTypeName.new_token,

                length: tsharkNewTokenFrame["quic.nt.length"],
                token: tsharkNewTokenFrame["quic.nt.token"].replace(/:/g, ''),
            };
        }


        public static convertStreamFrame(tsharkStreamFrame: any): IStreamFrame {
            return {
                frame_type: QUICFrameTypeName.stream,

                id: tsharkStreamFrame["quic.stream.stream_id"],

                offset: tsharkStreamFrame["quic.stream.offset"],
                length: tsharkStreamFrame["quic.stream.length"],

                fin: tsharkStreamFrame["quic.frame_type_tree"]["quic.stream.fin"] === "1",
                raw: tsharkStreamFrame["quic.stream_data"].replace(/:/g, ''),
            };
        }

        public static convertMaxDataFrame(tsharkMaxDataFrame: any): IMaxDataFrame {
            return {
                frame_type: QUICFrameTypeName.max_data,

                maximum: tsharkMaxDataFrame["quic.md.maximum_data"],
            }
        }

        public static convertMaxStreamDataFrame(tsharkMaxStreamDataFrame: any): IMaxStreamDataFrame {
            return {
                frame_type: QUICFrameTypeName.max_stream_data,

                id: tsharkMaxStreamDataFrame["quic.msd.stream_id"],
                maximum: tsharkMaxStreamDataFrame["quic.msd.maximum_stream_data"],
            };
        }

        public static convertMaxStreamsFrame(tsharkMaxStreamsFrame: any): IMaxStreamsFrame {
            return {
                frame_type: QUICFrameTypeName.max_streams,

                maximum: tsharkMaxStreamsFrame["quic.ms.max_streams"],
            };
        }

        public static convertDataBlockedFrame(tsharkDataBlockedFrame: any): IDataBlockedFrame {
            return {
                frame_type: QUICFrameTypeName.data_blocked,

                limit: tsharkDataBlockedFrame["quic.sb.stream_data_limit"],
            };
        }

        public static convertStreamDataBlockedFrame(tsharkStreamDataBlockedFrame: any): IStreamDataBlockedFrame {
            return {
                frame_type: QUICFrameTypeName.stream_data_blocked,

                id: tsharkStreamDataBlockedFrame["quic.sdb.stream_id"],
                limit: tsharkStreamDataBlockedFrame["quic.sb.stream_data_limit"],
            }
        }

        public static convertStreamsBlockedFrame(tsharkStreamsBlockedFrame: any): IStreamsBlockedFrame {
            return  {
                frame_type: QUICFrameTypeName.streams_blocked,

                limit: tsharkStreamsBlockedFrame["quic.sib.stream_limit"],
            };
        }

        public static convertNewConnectionIDFrame(tsharkNewConnectionIDFrame: any): INewConnectionIDFrame {
            return {
                frame_type: QUICFrameTypeName.new_connection_id,

                retire_prior_to: tsharkNewConnectionIDFrame["quic.nci.retire_prior_to"],
                sequence_number: tsharkNewConnectionIDFrame["quic.nci.sequence"],
                connection_id: tsharkNewConnectionIDFrame["quic.nci.connection_id"].replace(/:/g, ''),
                length: tsharkNewConnectionIDFrame["quic.nci.connection_id.length"],
                reset_token: tsharkNewConnectionIDFrame["quic.stateless_reset_token"].replace(/:/g, ''),
            };
        }

        public static convertRetireConnectionIDFrame(tsharkRetireConnectionIDFrame: any): IRetireConnectionIDFrame {
            return {
                frame_type: QUICFrameTypeName.retire_connection_id,

                sequence_number: tsharkRetireConnectionIDFrame["quic.rci.sequence"],
            };
        }

        public static convertPathChallengeFrame(tsharkPathChallengeFrame: any): IPathChallengeFrame {
            return {
                frame_type: QUICFrameTypeName.path_challenge,

                data: tsharkPathChallengeFrame["quic.path_challenge.data"].replace(/:/g, ''),
            };
        }

        public static convertPathResponseFrame(tsharkPathResponseFrame: any): IPathResponseFrame {
            return {
                frame_type: QUICFrameTypeName.path_response,
            };
        }

        public static convertConnectionCloseFrame(tsharkConnectionCloseFrame: any): IConnectionCloseFrame {
            const inApplicationLayer: boolean = tsharkConnectionCloseFrame["quic.frame_type"] === "29";
            return {
                frame_type: QUICFrameTypeName.connection_close,

                error_space: inApplicationLayer ? qlog.ErrorSpace.transport_error : qlog.ErrorSpace.transport_error,
                error_code: inApplicationLayer ? this.applicationErrorCodeToEnum(tsharkConnectionCloseFrame["quic.cc.error_code.app"]) : this.transportErrorCodeToEnum(tsharkConnectionCloseFrame["quic.cc.error_code"]),
                raw_error_code: inApplicationLayer ? tsharkConnectionCloseFrame["quic.cc.error_code.app"] : tsharkConnectionCloseFrame["quic.cc.error_code"],
                reason: tsharkConnectionCloseFrame["quic.cc.reason_phrase"],

                trigger_frame_type: tsharkConnectionCloseFrame["quic.cc.frame_type"],
            };
        }

        public static transportErrorCodeToEnum(errorCode: string): TransportError {
            const errorCodeNumber: number = parseInt(errorCode);
            if (errorCodeNumber === 0x00) {
                return TransportError.no_error;
            } else if (errorCodeNumber === 0x01) {
                return TransportError.internal_error;
            } else if (errorCodeNumber === 0x02) {
                return TransportError.server_busy;
            } else if (errorCodeNumber === 0x03) {
                return TransportError.flow_control_error;
            } else if (errorCodeNumber === 0x04) {
                return TransportError.stream_limit_error;
            } else if (errorCodeNumber === 0x05) {
                return TransportError.stream_state_error;
            } else if (errorCodeNumber === 0x06) {
                return TransportError.final_size_error;
            } else if (errorCodeNumber === 0x07) {
                return TransportError.frame_encoding_error;
            } else if (errorCodeNumber === 0x08) {
                return TransportError.transport_parameter_error;
            } else if (errorCodeNumber === 0x0a) {
                return TransportError.protocol_violation;
            } else if (errorCodeNumber === 0x0c) {
                return TransportError.invalid_migration;
            } else if (errorCodeNumber === 0x0d) {
                return TransportError.crypto_buffer_exceeded;
            } else if (errorCodeNumber >= 0x100 && errorCodeNumber <= 0x1ff) {
                return TransportError.crypto_error;
            } else {
                return TransportError.unknown;
            }
        }

        public static applicationErrorCodeToEnum(errorCode: string): ApplicationError {
            const errorCodeNumber: number = parseInt(errorCode);
            // FIXME Currently assumes HTTP as only application layer protocol
            if (errorCodeNumber === 0x00) {
                return ApplicationError.http_no_error;
            } else if (errorCodeNumber === 0x01) {
                return ApplicationError.http_general_protocol_error;
            } else if (errorCodeNumber === 0x02) {
                return ApplicationError.reserved;
            } else if (errorCodeNumber === 0x03) {
                return ApplicationError.http_internal_error;
            } else if (errorCodeNumber === 0x04) {
                return ApplicationError.reserved;
            } else if (errorCodeNumber === 0x05) {
                return ApplicationError.http_request_cancelled;
            } else if (errorCodeNumber === 0x06) {
                return ApplicationError.http_incomplete_request;
            } else if (errorCodeNumber === 0x07) {
                return ApplicationError.http_connect_error;
            } else if (errorCodeNumber === 0x08) {
                return ApplicationError.http_excessive_load;
            } else if (errorCodeNumber === 0x09) {
                return ApplicationError.http_version_fallback;
            } else if (errorCodeNumber === 0x0a) {
                return ApplicationError.http_wrong_stream;
            } else if (errorCodeNumber === 0x0b) {
                return ApplicationError.http_id_error;
            } else if (errorCodeNumber === 0x0c) {
                return ApplicationError.reserved;
            } else if (errorCodeNumber === 0x0d) {
                return ApplicationError.http_stream_creation_error;
            } else if (errorCodeNumber === 0x0e) {
                return ApplicationError.reserved;
            } else if (errorCodeNumber === 0x0f) {
                return ApplicationError.http_closed_critical_stream;
            } else if (errorCodeNumber === 0x10) {
                return ApplicationError.reserved;
            } else if (errorCodeNumber === 0x11) {
                return ApplicationError.http_early_response;
            } else if (errorCodeNumber === 0x12) {
                return ApplicationError.http_missing_settings;
            } else if (errorCodeNumber === 0x13) {
                return ApplicationError.http_unexpected_frame;
            } else if (errorCodeNumber === 0x14) {
                return ApplicationError.http_request_rejected;
            } else if (errorCodeNumber === 0xff) {
                return ApplicationError.http_settings_error;
            } else if (errorCodeNumber >= 0x100 && errorCodeNumber <= 0x1ff) {
                return ApplicationError.reserved;
            } else {
                return ApplicationError.unknown;
            }
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
            const layer_quic = this.jsonTrace[0]["_source"]["layers"]["quic"];

            if(!layer_ip) {
                layer_ip = this.jsonTrace[0]['_source']['layers']['ipv6'];
                return {
                    ip_version: layer_ip['ipv6.version'],
                    src_ip: layer_ip['ipv6.src'],
                    dst_ip: layer_ip['ipv6.dst'],
                    transport_protocol: "UDP",
                    src_port: layer_udp['udp.srcport'],
                    dst_port: layer_udp['udp.dstport'],
                    quic_version: this.getQUICVersion(),
                    src_cid: layer_quic["quic.scid"].replace(/:/g, ''),
                    dst_cid: layer_quic["quic.dcid"].replace(/:/g, ''),
                }
            }

            return {
                ip_version: layer_ip['ip.version'],
                src_ip: layer_ip['ip.src'],
                dst_ip: layer_ip['ip.dst'],
                transport_protocol: "UDP",
                src_port: layer_udp['udp.srcport'],
                dst_port: layer_udp['udp.dstport'],
                quic_version: this.getQUICVersion(),
                src_cid: layer_quic["quic.scid"].replace(/:/g, ''),
                dst_cid: layer_quic["quic.dcid"].replace(/:/g, ''),
            }
        }

}