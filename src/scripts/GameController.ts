/**
 * Class which controls the UI of the game.
 */
class GameController {
    static applyRouteBindings() {
        $('path, rect').hover(function () {
            const id = $(this).attr('data-town');
            if (id && id != 'mapTooltipWrapper') {
                const tooltip = $('#mapTooltip');
                tooltip.text(id);
                tooltip.css('visibility', 'visible');
            }
        }, () => {
            const tooltip = $('#mapTooltip');
            tooltip.text('');
            tooltip.css('visibility', 'hidden');
        });
    }

    static convertKey(key: string) {
        let newKey = key.length > 1 ? key : key.toUpperCase();
        if (newKey == ' ') {
            newKey = 'Space';
        }
        return newKey;
    }

    static simulateKey(code: string, type = 'keydown', modifiers = {}) {
        const evtName = type.startsWith('key') ? type : `key${type}`;

        const event = document.createEvent('HTMLEvents') as KeyboardEvent;
        Object.defineProperties(event, {
            key: {value: code},
        });
        event.initEvent(evtName, true, false);

        for (const i in modifiers) {
            event[i] = modifiers[i];
        }

        document.dispatchEvent(event);
    }

    static bindToolTips() {
        $('[data-toggle="popover"]').popover();
        $('[data-toggle="tooltip"]').tooltip();


        (ko as any).bindingHandlers.tooltip = {
            init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                const local = ko.utils.unwrapObservable(valueAccessor()),
                    options = {};

                ko.utils.extend(options, ko.bindingHandlers.tooltip.options);
                ko.utils.extend(options, local);

                $(element).tooltip(options);

                ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
                    $(element).tooltip('dispose');
                });
            },
            'update': function (element, valueAccessor) {
                const local = ko.utils.unwrapObservable(valueAccessor());
                const options = {};

                ko.utils.extend(options, ko.bindingHandlers.tooltip.options);
                ko.utils.extend(options, local);

                // Update the config of the tooltip
                const tooltipData = $(element).data('bs.tooltip');
                tooltipData.config.title = (options as any).title;

                // If the tooltip is visible, update its text
                const tooltipInner = tooltipData.tip && tooltipData.tip.querySelector('.tooltip-inner');
                if (tooltipInner) {
                    tooltipInner.innerHTML = tooltipData.config.title || '';
                }
                if (tooltipData && tooltipData.config) {
                    if (tooltipData.config.title === '') {
                        $(element).tooltip('hide');
                    }
                }
            },
            options: {
                placement: 'bottom',
                trigger: 'click',
            },
        };
    }

    static focusedOnEditableElement(): boolean {
        const activeEl = document.activeElement as HTMLElement;
        const localName: string = activeEl.localName.toLowerCase();
        const editables = ['textarea', 'input', 'select'];

        return (editables.includes(localName) || activeEl.isContentEditable);
    }

    // Store keys for multi-key combinations
    static keyHeld = {}
    static addKeyListeners() {
        // Oak Items
        const $oakItemsModal = $('#oakItemsModal');
        $oakItemsModal.on('hidden.bs.modal shown.bs.modal', _ => $oakItemsModal.data('disable-toggle', false));
        const oakItems = App.game.oakItems;
        // Pokeball Selector
        const $pokeballSelector = $('#pokeballSelectorModal');
        const pokeballs = App.game.pokeballs;
        // Underground
        const $undergroundModal = $('#mineModal');
        $undergroundModal.on('hidden.bs.modal shown.bs.modal', _ => $undergroundModal.data('disable-toggle', false));
        const underground = App.game.underground;
        // Farm
        const $farmsModal = $('#farmModal');
        $farmsModal.on('hidden.bs.modal shown.bs.modal', _ => $farmsModal.data('disable-toggle', false));
        const farms = App.game.farming;
        // Hatchery
        const $hatcheryModal = $('#breedingModal');
        $hatcheryModal.on('hidden.bs.modal shown.bs.modal', _ => $hatcheryModal.data('disable-toggle', false));
        const hatchery = App.game.breeding;

        $(document).on('keydown', e => {
            // Ignore any of our controls if focused on an input element
            if (this.focusedOnEditableElement()) {
                return;
            }

            const key = GameController.convertKey(e.key);

            // Set flags for any key currently pressed down (used to check if key held down currently)
            GameController.keyHeld[key] = true;

            // Set our number key if defined (-1 for 0 indexed)
            const numberKey = (+key) - 1;
            const isNumberKey = !isNaN(numberKey);

            const visibleModals = $('.modal:visible').length;

            // Safari Zone
            if (App.game.gameState === GameConstants.GameState.safari) {
                const dir = GameConstants.KeyCodeToDirection[key];
                if (dir) {
                    Safari.move(dir);
                }
                // We don't want to process any other keys while in the Safari zone
                return e.preventDefault();
            }

            // Within modals
            if ($farmsModal.data('bs.modal')?._isShown) {
                if (key == Settings.getSetting('hotkey.farm.toggleShovel').value) {
                    FarmController.selectedShovel() ? FarmController.selectedShovel(false) : FarmController.selectedShovel(true);
                    return e.preventDefault();
                }
            }
            if ($undergroundModal.data('bs.modal')?._isShown) {
                switch (key) {
                    case Settings.getSetting('hotkey.underground.hammer').value:
                        Mine.toolSelected(Mine.Tool.Hammer);
                        return e.preventDefault();
                    case Settings.getSetting('hotkey.underground.chisel').value:
                        Mine.toolSelected(Mine.Tool.Chisel);
                        return e.preventDefault();
                    case Settings.getSetting('hotkey.underground.survey').value:
                        Mine.survey();
                        return e.preventDefault();
                    case Settings.getSetting('hotkey.underground.bomb').value:
                        Mine.bomb();
                        return e.preventDefault();
                }
                if (isNumberKey) {
                    if (numberKey === 0) {
                        ItemList['SmallRestore'].use();
                    } else if (numberKey === 1) {
                        ItemList['MediumRestore'].use();
                    } else if (numberKey === 2) {
                        ItemList['LargeRestore'].use();
                    }
                    return e.preventDefault();
                }
            }
            if ($oakItemsModal.data('bs.modal')?._isShown) {
                // Toggle oak items
                if (isNumberKey) {
                    if (oakItems.isUnlocked(numberKey)) {
                        if (oakItems.isActive(numberKey)) {
                            oakItems.deactivate(numberKey);
                        } else {
                            oakItems.activate(numberKey);
                        }
                    }
                    return e.preventDefault();
                }
            }
            if ($pokeballSelector.data('bs.modal')?._isShown) {
                if (isNumberKey) {
                    // Switch selection type
                    if (GameController.keyHeld[Settings.getSetting('hotkey.pokeballSelection').value]) {
                        $('#pokeballSelectorBody .clickable.pokeball-selected').eq(numberKey)?.trigger('click');
                        return e.preventDefault();
                    }
                    // Select Pokeball from pokeball selector (0 = none)
                    if (numberKey < App.game.pokeballs.pokeballs.length) {
                        pokeballs.selectedSelection()(numberKey);
                    }
                    return e.preventDefault();
                }
            }

            // Only run if no modals are open
            if (visibleModals === 0) {
                // Route Battles
                if (App.game.gameState === GameConstants.GameState.fighting) {
                    const initialRoute = MapHelper.normalizeRoute(player.route(),player.region);
                    const firstRoute = Routes.getRoutesByRegion(player.region)[0].number;
                    const lastRoute = Routes.getRoutesByRegion(player.region)[Routes.getRoutesByRegion(player.region).length - 1].number;
                    // Allow '=' to fallthrough to '+' since they share a key on many keyboards
                    switch (key) {
                        case '=':
                        case '+':
                            if (initialRoute + 1 > MapHelper.normalizeRoute(lastRoute, player.region)) {
                                MapHelper.moveToRoute(firstRoute, player.region);
                            } else {
                                MapHelper.moveToRoute(Routes.unnormalizeRoute(initialRoute + 1), player.region);
                            }
                            return e.preventDefault();
                        case '-':
                            if (initialRoute - 1 < MapHelper.normalizeRoute(firstRoute, player.region)) {
                                MapHelper.moveToRoute(lastRoute, player.region);
                            } else {
                                MapHelper.moveToRoute(Routes.unnormalizeRoute(initialRoute - 1), player.region);
                            }
                            return e.preventDefault();
                    }
                }

                // Dungeons
                if (App.game.gameState === GameConstants.GameState.dungeon) {
                    switch (key) {
                        case 'ArrowUp':
                        case Settings.getSetting('hotkey.dungeon.up').value:
                            DungeonRunner.map.moveUp();
                            return e.preventDefault();
                        case 'ArrowLeft':
                        case Settings.getSetting('hotkey.dungeon.left').value:
                            DungeonRunner.map.moveLeft();
                            return e.preventDefault();
                        case 'ArrowDown':
                        case Settings.getSetting('hotkey.dungeon.down').value:
                            DungeonRunner.map.moveDown();
                            return e.preventDefault();
                        case 'ArrowRight':
                        case Settings.getSetting('hotkey.dungeon.right').value:
                            DungeonRunner.map.moveRight();
                            return e.preventDefault();
                        case Settings.getSetting('hotkey.dungeon.interact').value:
                            if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.entrance) {
                                DungeonRunner.dungeonLeave();
                            } else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest) {
                                DungeonRunner.openChest();
                            } else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss && !DungeonRunner.fightingBoss()) {
                                DungeonRunner.startBossFight();
                            }
                            return e.preventDefault();
                    }
                }

                // Within towns
                if (App.game.gameState === GameConstants.GameState.town) {
                    if (key === Settings.getSetting('hotkey.town.start').value) {
                        if (player.town().gym) {
                            GymRunner.startGym(player.town().gym);
                        } else if (player.town().dungeon) {
                            if (player.town() instanceof DungeonTown) {
                                DungeonRunner.initializeDungeon(player.town().dungeon);
                            } else {
                                MapHelper.moveToTown(player.town().dungeon.name);
                            }
                        }
                        return e.preventDefault();
                    } else if ('gymList' in player.town()) {
                        if (isNumberKey) {
                            // Check if a number higher than 0 and less than total Gyms was pressed
                            if (numberKey < player.town().gymList.length) {
                                GymRunner.startGym(player.town().gymList[numberKey]);
                            }
                            return e.preventDefault();
                        }
                    }
                }
            }

            // Anywhere keys
            switch (key) {
                case Settings.getSetting('hotkey.farm').value:
                    // Open the Farm
                    if (farms.canAccess() && !$farmsModal.data('disable-toggle')) {
                        $('.modal').modal('hide');
                        $farmsModal.data('disable-toggle', true);
                        $farmsModal.modal('toggle');
                        return e.preventDefault();
                    }
                    break;
                case Settings.getSetting('hotkey.hatchery').value:
                    // Open the Hatchery
                    if (hatchery.canAccess() && !$hatcheryModal.data('disable-toggle')) {
                        $('.modal').modal('hide');
                        $hatcheryModal.data('disable-toggle', true);
                        $hatcheryModal.modal('toggle');
                        return e.preventDefault();
                    }
                    break;
                case Settings.getSetting('hotkey.oakItems').value:
                    // Open oak items
                    if (oakItems.canAccess() && !$oakItemsModal.data('disable-toggle')) {
                        $('.modal').modal('hide');
                        $oakItemsModal.data('disable-toggle', true);
                        $oakItemsModal.modal('toggle');
                        return e.preventDefault();
                    }
                    break;
                case Settings.getSetting('hotkey.underground').value:
                    // Open the Underground
                    if (underground.canAccess() && !$undergroundModal.data('disable-toggle')) {
                        $('.modal').modal('hide');
                        $undergroundModal.data('disable-toggle', true);
                        $undergroundModal.modal('toggle');
                        return e.preventDefault();
                    }
                    break;
                case Settings.getSetting('hotkey.forceSave').value:
                    if (GameController.keyHeld['Shift']) {
                        Save.store(player);
                        return e.preventDefault();
                    }
                    break;
                default:
                    // Check for a number key being pressed
                    if (isNumberKey) {
                        if (GameController.keyHeld[Settings.getSetting('hotkey.pokeballSelection').value]) {
                            // Open pokeball selector modal using P + (1-4) for each condition
                            if (!($pokeballSelector.data('bs.modal')?._isShown)) {
                                $('.modal').modal('hide');
                            }
                            $('#pokeballSelectorBody .clickable.pokeball-selected').eq(numberKey)?.trigger('click');
                            return e.preventDefault();
                        }
                    }
            }

            if (key === 'Space') {
                return e.preventDefault();
            }
        });

        $(document).on('keyup', e => {
            // Ignore any of our controls if focused on an input element
            if (this.focusedOnEditableElement()) {
                return;
            }

            const key = GameController.convertKey(e.key);
            // Our key is no longer being held down
            delete GameController.keyHeld[key];

            if (App.game.gameState === GameConstants.GameState.safari) {
                const dir = GameConstants.KeyCodeToDirection[key];
                if (dir) {
                    e.preventDefault();
                    Safari.stop(dir);
                }
            }

            if (key === 'Space') {
                return e.preventDefault();
            }
        });
    }
}

$(document).ready(() => {
    $('#pokedexModal').on('show.bs.modal', PokedexHelper.updateList);
});

// when stacking modals allow scrolling after top modal hidden
$(document).on('hidden.bs.modal', '.modal', () => {
    $('.modal:visible').length && $(document.body).addClass('modal-open');
});
