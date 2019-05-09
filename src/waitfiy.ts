
import * as vscode from 'vscode';

import { promisify } from './promisify';

export function waitfiy<T>(text: string, func: (...argArray: any[]) => Promise<T>, thisArg?: any): (...argArray: any[]) => Promise<T> {
	const caller = function (...argArray: any[]): Thenable<T> {
		return vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: text,
		}, () => {
			return func.call(this, ...argArray);
		});
	}

	return promisify(caller, thisArg);
}
