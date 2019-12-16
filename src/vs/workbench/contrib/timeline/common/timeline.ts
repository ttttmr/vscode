/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/base/common/cancellation';
import { URI } from 'vs/base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/base/common/event';
import { IDisposable } from 'vs/base/common/lifecycle';

export interface TimelineItem {
	date: Date;
	source: string;
	label: string;
	id?: string;
	// iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
	description?: string;
	detail?: string;

	// resourceUri?: Uri;
	// tooltip?: string | undefined;
	// command?: Command;
	// collapsibleState?: TreeItemCollapsibleState;
	// contextValue?: string;
}

export interface TimelineProvider {
	id: string;
	// selector: DocumentSelector;

	provideTimeline(uri: URI, since: Date, token: CancellationToken): Promise<TimelineItem[] | undefined>;
}

export interface ITimelineService {
	readonly _serviceBrand: undefined;

	onDidChangeProviders: Event<void>;
	registerTimelineProvider(provider: TimelineProvider): IDisposable;

	getTimeline(resource: URI, since: Date, token: CancellationToken): Promise<TimelineItem[]>;
}

const TIMELINE_SERVICE_ID = 'timeline';
export const ITimelineService = createDecorator<ITimelineService>(TIMELINE_SERVICE_ID);
