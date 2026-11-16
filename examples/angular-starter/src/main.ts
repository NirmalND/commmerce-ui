import { bootstrapApplication } from '@angular/platform-browser';
// Registers every cm-* element (the CSS files are listed in angular.json "styles").
import '@commmerce/ui';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
