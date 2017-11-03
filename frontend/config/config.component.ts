import {Component, OnInit, OnDestroy} from '@angular/core';
import {Router} from '@angular/router';

import {SessionsService} from './sessions.service';
import {Session} from './session';

@Component({
    selector: 'netopeer-config',
    templateUrl: './config.component.html',
    styleUrls: ['../netopeer.css', './config.component.css', './tree.component.css', '../inventory/inventory.component.css']
})

export class ConfigComponent implements OnInit, OnDestroy {
    title = 'Configuration';
    activeSession: Session;
    err_msg = "";

    objectKeys = Object.keys;
    constructor(private sessionsService: SessionsService, private router: Router) {}

    addSession() {
        this.router.navigateByUrl('/netopeer/inventory/devices');
    }

    reloadData() {
        this.activeSession.data = null;
        if (this.activeSession.dataVisibility == 'all') {
            this.rpcGet(true);
        } else if(this.activeSession.dataVisibility == 'root') {
            this.rpcGet(false);
        }
    }

    disconnect(key: string) {
        this.sessionsService.close(key).subscribe(result => {
            if (result['success']) {
                if (!this.sessionsService.activeSession) {
                    this.router.navigateByUrl('/netopeer/inventory/devices');
                }
            } else {
                this.err_msg = result['error-msg'];
            }
        });
    }

    getCapabilities(key: string) {
        if (this.activeSession.cpblts) {
            return;
        }
        this.sessionsService.getCpblts(key).subscribe(result => {
            if (result['success']) {
                this.activeSession.cpblts = result['capabilities'];
            } else {
                this.activeSession.cpbltsVisibility = false;
                this.err_msg = result['error-msg'];
            }
        });
    }

    parseCapabilityName(cpblt: string): string {
        let name = cpblt;
        let pos = cpblt.search('module=');
        if (pos != -1) {
            /* schema */
            pos += 7;
            name = cpblt.slice(pos);
            let end = name.search('&');
            if (end != -1) {
                name = name.slice(0, end);
            }
        } else {
            /* capability */
            pos = 0;
            if (cpblt.match('urn:ietf:params:netconf:capability:*')) {
                pos = 34;
            } else if (cpblt.match('urn:ietf:params:netconf:*')) {
                pos = 23;
            }
            name = cpblt.slice(pos);

            let end = name.search('\\?');
            if (end != -1) {
                name = name.slice(0, end);
            }
            pos = name.lastIndexOf(':')
            name = name.slice(0, pos);
        }
        return name;
    }

    parseCapabilityRevision(cpblt: string): string {
        let version = "";
        let pos = cpblt.search('revision=');
        if (pos != -1) {
            pos += 9;
            version = cpblt.slice(pos);
            let end = version.search('&');
            if (end != -1) {
                version = version.slice(0, end);
            }
            return version;
        } else if (cpblt.match('urn:ietf:params:netconf:*')) {
            let end = cpblt.search('\\?');
            if (end != -1) {
                cpblt = cpblt.slice(0, end);
            }
            pos = cpblt.lastIndexOf(':')
            version = cpblt.slice(pos + 1);
        }
        return version;
    }

    rpcGet(all: boolean) {
        if (this.activeSession.data) {
            if ((all && this.activeSession.dataVisibility == 'all') ||
                (!all && this.activeSession.dataVisibility == 'root')) {
                return;
            }
        }
        this.sessionsService.rpcGetSubtree(this.activeSession.key, all).subscribe(result => {
            if (result['success']) {
                this.activeSession.data = result['data'];
            } else {
                this.activeSession.dataVisibility = 'none';
                if ('error-msg' in result) {
                    this.err_msg = result['error-msg'];
                } else {
                    this.err_msg = result['error'][0]['message'];
                }
            }
        });
    }

    ngOnInit(): void {
        this.sessionsService.checkSessions();
        this.activeSession = this.sessionsService.getActiveSession(this.sessionsService.activeSession);
    }

    changeActiveSession(key: string) {
        this.sessionsService.activeSession = key;
        this.activeSession = this.sessionsService.getActiveSession(this.sessionsService.activeSession);
    }

    ngOnDestroy(): void {
        this.sessionsService.changingView();
    }
}