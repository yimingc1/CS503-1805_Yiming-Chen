import { Component, OnInit } from '@angular/core';
// import router to get the url
import { ActivatedRoute, Params } from '@angular/router';
import { CollaborationService } from '../../services/collaboration.service';
import { DataService } from '../../services/data.service';

declare var ace: any;

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})

export class EditorComponent implements OnInit {
	editor: any;
	sessionID: string;
	public languages: string[] = ['Java', 'Python'];
	language: string = 'Java';
  output: string = '';

	defaultContent = {
		'Java': `public class Example {
			public static void main(String[] args) {
				// Type your Java code here
			}
		}
		`,
		'Python': `class Solution:
			def example():
				# write your Python code here`
	}

	// inject collaboration service and route service
  constructor(private collaboration: CollaborationService, private route: ActivatedRoute, 
    private dataService: DataService) { }

  // use problem id as session id 
  // subscribe to params, so that when it changes, the session id get updated
  ngOnInit() {
  	this.route.params
  		.subscribe(params => {
  			this.sessionID = params['id'];
  			this.initEditor();
  		})

     // restore buffer from backend when initialize the editor
     // when new participant appears, get others work from backend.
     this.collaboration.restoreBuffer();
  }

  initEditor(): void {
  	this.editor = ace.edit("editor");
  	this.editor.setTheme("ace/theme/eclipse");
  	this.resetEditor();

  	document.getElementsByTagName('textarea')[0].focus();

  	// Initialize the connection with backend server.
  	this.collaboration.init(this.editor, this.sessionID);

  	// track the last local change
  	this.editor.lastAppliedChange = null;

  	// register change callback, when client change the content in editor 
  	// 
  	this.editor.on('change', (e) => {
  		console.log('editior change: ' + JSON.stringify(e));

  		// check if the change comes from self,
  		// if not, send the change to collaboration
  		if(this.editor.lastAppliedChange != e){
  			this.collaboration.change(JSON.stringify(e));
  		}
  	})
  }

  resetEditor(): void {
  	this.editor.getSession().setMode("ace/mode/" + this.language.toLowerCase());
  	this.editor.setValue(this.defaultContent[this.language]);
  }

  setLanguage(language): void {
  	this.language = language;
  	this.resetEditor();
  }

  submit(): void {
  	let usercode = this.editor.getValue();
  	console.log(usercode);

    // create object that contains code and lang
    // send this to server
    const data = {
      code: usercode,
      lang: this.language.toLowerCase()
    }

    this.dataService.buildAndRun(data).then(res => this.output = res);
  }
  }
}
