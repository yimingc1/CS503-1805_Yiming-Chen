import { Injectable } from '@angular/core';

declare var io: any; // reference the io object in socket.io

@Injectable({
  providedIn: 'root'
})
export class CollaborationService {
	collaborationSocket: any;

  constructor() { }
  
  // take two parameters
  init(editor: any, sessionID: string): void {
  	// window.location.origin is the server location of the current page, i.e. the domain name.
  	// {query: 'sessionID= ' + sessionID} is the connection message. e.g. /problem/1
  	// when handshake happens, pass the sessionID to the server, attach it with sockectID
  	// each open browser has unique socketID
  	this.collaborationSocket = io(window.location.origin, { query: 'sessionID=' + sessionID});

  	// wait for the change event
  	// when connected, run the callback func to response with message.
  	this.collaborationSocket.on('change', (delta: string) => {
  		console.log('collaboration: editor changes ' + delta);
  		delta = JSON.parse(delta);
  		
  		// record the last applied change from the server by other client
  		editor.lastAppliedChange = delta;
  		editor.getSession().getDocument().applyDeltas([delta]);
  	})
  }

  change(delta: string): void {
  	// emit the change evnet
  	this.collaborationSocket.emit('change', delta);
  }
}
