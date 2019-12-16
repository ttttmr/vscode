/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/timelinePane';
import * as nls from 'vs/nls';
import * as dom from 'vs/base/browser/dom';
import { IViewsRegistry, IViewDescriptor, Extensions as ViewExtensions } from 'vs/workbench/common/views';
import { ViewPane, IViewPaneOptions } from 'vs/workbench/browser/parts/views/viewPaneContainer';
import { WorkbenchAsyncDataTree } from 'vs/platform/list/browser/listService';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { ICommandService } from 'vs/platform/commands/common/commands';
// import { IMenuService } from 'vs/platform/actions/common/actions';
// import { IThemeService } from 'vs/platform/theme/common/themeService';
import { Registry } from 'vs/platform/registry/common/platform';
import { IAsyncDataSource, ITreeNode, ITreeRenderer } from 'vs/base/browser/ui/tree/tree';
import { IconLabel } from 'vs/base/browser/ui/iconLabel/iconLabel';
import { TimelineItem } from 'vs/workbench/contrib/timeline/common/timeline';
import { IListVirtualDelegate, IIdentityProvider } from 'vs/base/browser/ui/list/list';
import { TreeElement } from 'vs/editor/contrib/documentSymbols/outlineModel';
import { SIDE_BAR_BACKGROUND } from 'vs/workbench/common/theme';
import { values } from 'vs/base/common/collections';
import { ITextModel } from 'vs/editor/common/model';
import { VIEW_CONTAINER } from 'vs/workbench/contrib/files/browser/explorerViewlet';

export class TimelinePane extends ViewPane {
	static readonly ID = 'timeline';
	static readonly TITLE = nls.localize('timeline', "Timeline");
	private tree!: WorkbenchAsyncDataTree<any, any, any>;

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService protected keybindingService: IKeybindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@IOpenerService protected openerService: IOpenerService,
		@IQuickInputService protected quickInputService: IQuickInputService,
		@ICommandService protected commandService: ICommandService,
		// @IMenuService private readonly menuService: IMenuService,
		// @IContextViewService private readonly contextViewService: IContextViewService,
		// @IThemeService private readonly themeService: IThemeService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService);

		const scopedContextKeyService = this._register(this.contextKeyService.createScoped());
		scopedContextKeyService.createKey('view', TimelinePane.ID);

		// const titleMenu = this._register(this.menuService.createMenu(MenuId.TunnelTitle, scopedContextKeyService));
		// const updateActions = () => {
		// 	this.titleActions = [];
		// 	this.titleActionsDisposable.value = createAndFillInActionBarActions(titleMenu, undefined, this.titleActions);
		// 	this.updateActions();
		// };

		// this._register(titleMenu.onDidChange(updateActions));
		// updateActions();

		// this._register(toDisposable(() => {
		// 	this.titleActions = [];
		// }));
	}

	protected renderBody(container: HTMLElement): void {
		dom.addClass(container, '.tree-explorer-viewlet-tree-view');
		const treeContainer = document.createElement('div');
		dom.addClass(treeContainer, 'customview-tree');
		dom.addClass(treeContainer, 'file-icon-themable-tree');
		dom.addClass(treeContainer, 'show-file-icons');
		container.appendChild(treeContainer);

		const renderer = this.instantiationService.createInstance(TimelineTreeRenderer);
		this.tree = this.instantiationService.createInstance<typeof WorkbenchAsyncDataTree, WorkbenchAsyncDataTree<TimelineModel, TreeElement>>(WorkbenchAsyncDataTree,
			'TimelinePane',
			treeContainer,
			new TimelineVirtualDelegate(),
			[renderer],
			new TimelineDataSource(),
			{
				expandOnlyOnTwistieClick: true,
				multipleSelectionSupport: false,
				filterOnType: false,
				identityProvider: new TimelineIdentityProvider(),
				// keyboardNavigationLabelProvider: new OutlineNavigationLabelProvider(),
				hideTwistiesOfChildlessElements: true,
				overrideStyles: {
					listBackground: SIDE_BAR_BACKGROUND
				}
			}
		);
	}

	focus(): void {
		super.focus();
		this.tree.domFocus();
	}

	protected layoutBody(height: number, width: number): void {
		this.tree.layout(height, width);
	}
}

export class TimelinePaneDescriptor implements IViewDescriptor {
	readonly id = TimelinePane.ID;
	readonly name = TimelinePane.TITLE;
	readonly ctorDescriptor = { ctor: TimelinePane };
	readonly canToggleVisibility = true;
	readonly hideByDefault = false;
	readonly collapsed = true;
	readonly order = 2;
	readonly weight = 30;
	focusCommand = { id: 'timeline.focus' };
}

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([new TimelinePaneDescriptor()], VIEW_CONTAINER);

export class TimelineElement extends TreeElement {

	children: { [id: string]: TimelineElement; } = Object.create(null);
	// marker: { count: number, topSev: MarkerSeverity } | undefined;

	constructor(
		readonly id: string,
		public parent: TreeElement | undefined,
		readonly item: TimelineItem
	) {
		super();
	}

	adopt(parent: TreeElement): TimelineElement {
		let res = new TimelineElement(this.id, parent, this.item);
		// forEach(this.children, entry => res.children[entry.key] = entry.value.adopt(res));
		return res;
	}
}

export class TimelineElementTemplate {
	static readonly id = 'TimelineElementTemplate';
	constructor(
		readonly container: HTMLElement,
		readonly iconLabel: IconLabel,
		// readonly iconClass: HTMLElement,
		// readonly decoration: HTMLElement,
	) { }
}

export class TimelineModel extends TreeElement {
	readonly id = 'root';
	readonly parent = undefined;

	children: { [id: string]: TimelineElement; } = Object.create(null);

	protected constructor(readonly textModel: ITextModel) {
		super();

		this.id = 'root';
		this.parent = undefined;
	}
	adopt(newParent: TreeElement): TimelineModel {
		let res = new TimelineModel(this.textModel);
		// forEach(this._groups, entry => res._groups[entry.key] = entry.value.adopt(res));
		return res;
	}
}

export class TimelineDataSource implements IAsyncDataSource<TimelineModel, TimelineElement> {
	hasChildren(element: TimelineModel | TimelineElement): boolean {
		return element instanceof TimelineModel;
	}

	getChildren(element: undefined | TimelineModel | TimelineElement): TimelineElement[] {
		if (!element) {
			return [];
		}
		if (element instanceof TimelineModel) {
			return values(element.children);
		}
		return [];
	}
}

export class TimelineIdentityProvider implements IIdentityProvider<TimelineItem> {
	getId(item: TimelineItem): { toString(): string; } {
		return `${item.id}|${item.date.getTime()}`;
	}
}

export class TimelineVirtualDelegate implements IListVirtualDelegate<TimelineItem> {

	getHeight(_element: TimelineItem): number {
		return 22;
	}

	getTemplateId(element: TimelineItem): string {
		// if (element instanceof TimelineGroup) {
		// 	return TimelineGroupTemplate.id;
		// } else {
		return TimelineElementTemplate.id;
		// }
	}
}

class TimelineTreeRenderer implements ITreeRenderer<TimelineElement, void, TimelineElementTemplate> {
	readonly templateId: string = TimelineElementTemplate.id;

	constructor(
		// private readonly viewId: string,
		// @IMenuService private readonly menuService: IMenuService,
		// @IContextKeyService private readonly contextKeyService: IContextKeyService,
		// @IInstantiationService private readonly instantiationService: IInstantiationService,
		// @IContextViewService private readonly contextViewService: IContextViewService,
		// @IThemeService private readonly themeService: IThemeService,
	) {
	}

	renderTemplate(container: HTMLElement): TimelineElementTemplate {
		dom.addClass(container, 'custom-view-tree-node-item');
		const iconLabel = new IconLabel(container, { supportHighlights: true });

		return new TimelineElementTemplate(container, iconLabel);
	}

	renderElement(node: ITreeNode<TimelineElement>, index: number, template: TimelineElementTemplate, height: number | undefined): void {
		const { element } = node;

		template.iconLabel.setLabel(element.item.label, element.item.description);
	}

	disposeTemplate(template: TimelineElementTemplate): void {
		template.iconLabel.dispose();
	}
}

