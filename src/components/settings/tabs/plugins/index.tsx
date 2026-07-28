/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { isPluginEnabled, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Notice } from "@components/Notice";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { HeadingTertiary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab } from "@components/settings";
import { debounce } from "@shared/debounce";
import { ChangeList } from "@utils/ChangeList";
import { classNameFactory } from "@utils/css";
import { isTruthy } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { Alerts, lodash, Parser, React, SearchableSelect, Select as DiscordSelect, TextInput, Toasts, Tooltip, useCallback, useMemo, useState } from "@webpack/common";
import { JSX } from "react";
import { t } from "@api/i18n";

import Plugins, { ExcludedPlugins, PluginMeta } from "~plugins";

import { PluginCard } from "./PluginCard";
import { openPluginModal, openResetDefaultsModal, openWarningModal } from "./PluginModal";
import { StockPluginsCard } from "./PluginStatCards";
import { TUTORIAL_PLUGIN_NAMES } from "./tutorialList";
import { UIElementsButton } from "./UIElements";

const NIGHTCORD_TAB_ICON = "data:image/png;base64,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";
const VENCORD_EQUICORD_TAB_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAAJFBMVEVHcExAPz78+/tWVFSGhIT8+/tSTU37+flhWlrrdpjptMUiIiHE2RBUAAAACXRSTlMA//38+rGaWE6GHvjSAAACyUlEQVR4nO1Uv0/bUBB+peLHyOEqavWWcsSi9YRxhWi7FGK1lCyVpYiVKlLUEUVC6miJtsqczd4wLDbTK5l4/1zv3nuJnUCHqisnRS/y9/m7u+/OT4jH+Nc490/MORoMBqM5ZBm3+UBE/0ys9SOOvbTGVwnhI3hWoO9witMaD8LiC+m0tX6DnShaZCRBV+9SjqVNrXRxUBOi1Al0tb7zhRjeaKWaCtG+JQRaa4VnIulqdYtRtCixiu+JQUXQqSaBF92TSG6k1hvbq0hCd0wgE0aDhsRSW0k98Zcpldpoe9E389ovQ9ixOQCkwvMtyrS75XBmeJ63Z/5iV4I8xE0iHF62Zv71ZzmGm0rK33jDtXY+9XonZ4awwhLGrOVAKT1hOxQWyGGHFnlhuO8aBa1RAkwIrKoKzfAuQoq9utFjLeUdwRlFQb71OYPnCdsom6lB7pZZmRnGq34ErBA6MyUzlP6cuRhveRB69HMj5QK1hluL5mVWXAKhoQdgCUP2AOQ7R6gyPOC3L4izY3fOTFSVU0KFIXitdAUALIEnWWeoqpwIrVSskIwjJGSjemEbQCzHQQhUPiusi1mj8q0pz1jZDkEYgrc+XVwqwmav4mPEK2iJOQWRXMUx6VdFEFNcAzynh0/rIsWQdAmvijbhHbD9P4GpD5Sj1wsoQ8kExs1afG0QeLudwtGa6ZEiJEI6R8hIgVfup89P1giH5hfKRo637cf60pXQahIqYuS0CSLBsW9KULMujd1MyNDvJVjmyC4oUKcNQmKWKad+qRr60qgZBc1rZPjazcrW8qOjVLMEmgf3WbqFyP04BgnNDFQlG2FU6MA4ljCXgaosHYGy5EToqPV5wjCobAqimaF10nkCXVa1wDURPoiFGGLlGkEW+LiIs8Wl84K3Ir1HoBuV7KT3TYIHcLqNzUYyfvQgzouT+CffB6O/wI/xH/EHRrhV74EZqhwAAAAASUVORK5CYII=";

function NightcordTabIcon() {
    return <img src={NIGHTCORD_TAB_ICON} alt="Nightcord" style={{ width: 18, height: 18, borderRadius: 4 }} />;
}

function VencordEquicordTabIcon() {
    return <img src={VENCORD_EQUICORD_TAB_ICON} alt="Vencord & Equicord" style={{ width: 18, height: 18, borderRadius: 4 }} />;
}

function UserPluginsTabIcon() {
    return <img src="https://equicord.org/assets/icons/misc/userplugin.png" alt={t("User Plugins")} style={{ width: 18, height: 18, borderRadius: 4 }} />;
}

const makeCategoryOptions = (othersCount?: number) => [
    { label: "Vencord & Equicord", value: SearchStatus.OTHERS },
    { label: "Nightcord", value: SearchStatus.NIGHTCORD },
    { label: t("User Plugins"), value: SearchStatus.USER_PLUGINS },
    { label: t("Community Plugins"), value: "community", disabled: true }
];
export const cl = classNameFactory("vc-plugins-");
export const logger = new Logger("PluginSettings", "#a6d189");

function showErrorToast(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.FAILURE,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });
}

function ReloadRequiredCard({ required, enabledPlugins, openWarningModal, resetCheckAndDo, applyDefaultConfigCheckAndDo }) {
    return (
        <Card className={classes(cl("info-card"), required && "vc-warning-card")}>
            {required ? (
                <>
                    <HeadingTertiary>{t("Restart required!")}</HeadingTertiary>
                    <Paragraph className={cl("dep-text")}>
                        {t("Restart now to apply new plugins and their settings")}
                    </Paragraph>
                    <Button variant="primary" className={cl("restart-button")} onClick={() => relaunch()}>
                        {t("Restart")}
                    </Button>
                </>
            ) : (
                <>
                    <HeadingTertiary>{t("Plugin Management")}</HeadingTertiary>
                    <Paragraph>{t("Press the cog wheel or info icon to get more info on a plugin")}</Paragraph>
                    <Paragraph>{t("Plugins with a cog wheel have settings you can modify!")}</Paragraph>
                </>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
                {enabledPlugins.length > 0 && !required && (
                    <Button
                        variant="secondary"
                        size="small"
                        className={"vc-plugins-disable-warning vc-modal-align-reset"}
                        onClick={() => {
                            return openWarningModal(null, undefined, false, enabledPlugins.length, resetCheckAndDo);
                        }}
                    >
                        {t("Disable All Plugins")}
                    </Button>
                )}
                {!required && (
                    <Button
                        variant="secondary"
                        size="small"
                        className={"vc-plugins-disable-warning vc-modal-align-reset"}
                        onClick={() => {
                            return openResetDefaultsModal(applyDefaultConfigCheckAndDo);
                        }}
                    >
                        {t("Apply Default Config")}
                    </Button>
                )}
            </div>
        </Card>
    );
}

export const ExcludedReasons: Record<"web" | "discordDesktop" | "vesktop" | "equibop" | "desktop" | "dev", string> = {
    desktop: "Discord Desktop app or Vesktop/Equibop",
    discordDesktop: "Discord Desktop app",
    vesktop: "Vesktop/Equibop apps",
    equibop: "Vesktop/Equibop apps",
    web: "Vesktop/Equibop apps & Discord web",
    dev: "Developer version of Nightcord"
};

function ExcludedPluginsList({ search }: { search: string; }) {
    const matchingExcludedPlugins = search
        ? Object.entries(ExcludedPlugins)
            .filter(([name]) => name.toLowerCase().includes(search))
        : [];

    return (
        <Paragraph className={Margins.top16}>
            {matchingExcludedPlugins.length
                ? <>
                    <Paragraph>{t("Are you looking for:")}</Paragraph>
                    <ul>
                        {matchingExcludedPlugins.map(([name, reason]) => (
                            <li key={name}>
                                <b>{name}</b>: Only available on the {ExcludedReasons[reason]}
                            </li>
                        ))}
                    </ul>
                </>
                : t("No plugins meet the search criteria.")
            }
        </Paragraph>
    );
}

import { SearchStatus, TUTORIAL_CACHE } from "./components/Common";

// Fallback select natif si le composant Discord n'est pas trouvé
function NativeSelect({ options, select, isSelected }: any) {
    const currentVal = options.find((o: any) => isSelected(o.value))?.value ?? options.find((o: any) => o.default)?.value ?? options[0]?.value;
    return (
        <select
            style={{
                background: "var(--background-secondary)",
                color: "var(--text-normal)",
                border: "1px solid var(--background-modifier-accent)",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 14,
                cursor: "pointer",
                outline: "none",
            }}
            value={currentVal}
            onChange={e => select(Number(e.target.value))}
        >
            {options.map((o: any) => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

const Select = DiscordSelect || NativeSelect;
interface PluginSettingsProps {
    premiumOnly?: boolean;
}

export default function PluginSettings({ premiumOnly = false }: PluginSettingsProps) {
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);

    // Expand Discord's content column to fill the full available width
    React.useEffect(() => {
        const col = document.querySelector<HTMLElement>('[class*="contentColumn"]');
        if (!col) return;
        const prevPaddingLeft = col.style.paddingLeft;
        const prevPaddingRight = col.style.paddingRight;
        const prevMaxWidth = col.style.maxWidth;
        col.style.paddingLeft = "16px";
        col.style.paddingRight = "16px";
        col.style.maxWidth = "none";
        return () => {
            col.style.paddingLeft = prevPaddingLeft;
            col.style.paddingRight = prevPaddingRight;
            col.style.maxWidth = prevMaxWidth;
        };
    }, []);

    // Static list — no fetch, no CORS issues.
    // Also populate TUTORIAL_CACHE so the SearchStatus.TUTORIAL filter works.
    const tutorialPlugins = useMemo(() => {
        for (const name of Object.values(Plugins).map(p => p.name).filter(Boolean)) {
            TUTORIAL_CACHE.set(name, TUTORIAL_PLUGIN_NAMES.has(name));
        }
        return TUTORIAL_PLUGIN_NAMES;
    }, []);

    React.useEffect(() => {
        return () => {
            if (!changes.hasChanges) return;

            const allChanges = [...changes.getChanges()];
            const pluginNames = [...new Set(allChanges.map(s => s.split(":")[0]))];
            const maxDisplay = 15;
            const displayed = pluginNames.slice(0, maxDisplay);
            const remainingCount = pluginNames.length - displayed.length;

            Alerts.show({
                title: "Restart required",
                body: (
                    <div>
                        {displayed.map((s, i) => (
                            <span key={i}>
                                {i > 0 && ", "}
                                {Parser.parse("`" + s + "`")}
                            </span>
                        ))}
                        {remainingCount > 0 && <span> and {remainingCount} more</span>}
                    </div>
                ),
                confirmText: "Restart now",
                cancelText: "Later!",
                onConfirm: () => relaunch()
            });
        };
    }, []);

    const depMap = useMemo(() => {
        const o = {} as Record<string, string[]>;
        for (const plugin in Plugins) {
            const deps = Plugins[plugin].dependencies;
            if (deps) {
                for (const dep of deps) {
                    o[dep] ??= [];
                    o[dep].push(plugin);
                }
            }
        }
        return o;
    }, []);

    const sortedPlugins = useMemo(() => Object.values(Plugins)
        .filter(p => typeof p.name === "string")
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")), []);

    const hasUserPlugins = useMemo(() => !IS_STANDALONE && Object.values(PluginMeta).some(m => m.userPlugin), []);

    const [searchValue, setSearchValue] = useState({ value: "", status: SearchStatus.NIGHTCORD });
    const [searchInput, setSearchInput] = useState("");

    const debouncedSetSearch = useMemo(
        () => debounce((query: string) => setSearchValue(prev => ({ ...prev, value: query })), 150),
        []
    );

    const search = searchValue.value.toLowerCase();
    const onSearch = useCallback((query: string) => {
        setSearchInput(query);
        debouncedSetSearch(query);
    }, [debouncedSetSearch]);

    const BATCH_SIZE = 40;
    const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);

    const observer = React.useRef<IntersectionObserver>();
    const sentinelRef = React.useCallback((node: HTMLDivElement | null) => {
        if (observer.current) observer.current.disconnect();
        if (node) {
            observer.current = new IntersectionObserver(
                entries => {
                    if (entries[0].isIntersecting) {
                        const total = allDataLengthRef.current;
                        React.startTransition(() => {
                            setVisibleCount(v => Math.min(v + BATCH_SIZE, total));
                        });
                    }
                },
                { rootMargin: "400px" } // trigger loading before it comes into view
            );
            observer.current.observe(node);
        }
    }, []);

    const onStatusChange = useCallback((status: SearchStatus) => {
        setVisibleCount(BATCH_SIZE);
        React.startTransition(() => {
            setSearchValue(prev => ({ ...prev, status }));
        });
    }, []);

    const pluginFilter = useCallback((plugin: typeof Plugins[keyof typeof Plugins], newPluginsSet: Set<string> | null) => {
        // Filter by premium status first
        const isPremiumPlugin = !!plugin.premium;
        if (premiumOnly) {
            if (!isPremiumPlugin) return false;
        } else {
            if (isPremiumPlugin) return false;
        }

        const { status } = searchValue;
        const enabled = isPluginEnabled(plugin.name);

        const pluginMeta = PluginMeta[plugin.name];

        switch (status) {
            case SearchStatus.DISABLED:
                if (enabled) return false;
                break;
            case SearchStatus.ENABLED:
                if (!enabled) return false;
                break;
            case SearchStatus.NIGHTCORD:
                if (!pluginMeta?.folderName?.startsWith("src/nightcordplugins/")) return false;
                break;
            case SearchStatus.OTHERS:
                if (pluginMeta?.folderName?.startsWith("src/nightcordplugins/") || pluginMeta?.folderName?.startsWith("src/plugins/_")) return false;
                if (!pluginMeta?.folderName?.startsWith("src/plugins/")) return false;
                break;
            case SearchStatus.VENCORD:
                if (!pluginMeta?.folderName?.startsWith("src/plugins/")) return false;
                break;
            case SearchStatus.NEW:
                if (!newPluginsSet?.has(plugin.name)) return false;
                break;
            case SearchStatus.USER_PLUGINS:
                if (!pluginMeta?.userPlugin) return false;
                break;
            case SearchStatus.API_PLUGINS:
                if (!plugin.name.endsWith("API")) return false;
                break;
            case SearchStatus.TUTORIAL:
                if (!TUTORIAL_CACHE.get(plugin.name)) return false;
                break;
        }

        if (!search.length) return true;

        const isNightcordPartner = (
            plugin.name === "DynamicIslande" ||
            plugin.name === "StereoInstaller" ||
            plugin.name === "ClientDiagnostics" ||
            plugin.name === "SecureBookmarks" ||
            plugin.name === "StatusCycler" ||
            plugin.name === "MutualScanner"
        );

        if ((search.includes("nightcord") || search.includes("night")) && isNightcordPartner) {
            return true;
        }

        return (
            plugin.name.toLowerCase().includes(search.replace(/\s+/g, "")) ||
            plugin.description.toLowerCase().includes(search) ||
            plugin.tags?.some(t => t.toLowerCase().includes(search))
        );
    }, [searchValue, search]);

    const [newPluginsSet] = useAwaiter(() => DataStore.get("Vencord_existingPlugins").then((cachedPlugins: Record<string, number> | undefined) => {
        const now = Date.now() / 1000;
        const existingTimestamps: Record<string, number> = {};
        const sortedPluginNames = Object.values(sortedPlugins).map(plugin => plugin.name);

        const newPlugins: string[] = [];
        for (const { name: p } of sortedPlugins) {
            const time = existingTimestamps[p] = cachedPlugins?.[p] ?? now;
            if ((time + 60 * 60 * 24 * 2) > now) {
                newPlugins.push(p);
            }
        }
        DataStore.set("Vencord_existingPlugins", existingTimestamps);

        return lodash.isEqual(newPlugins, sortedPluginNames) ? null : new Set(newPlugins);
    }));

    const handleRestartNeeded = useCallback((name: string, key: string) => changes.handleChange(`${name}:${key}`), [changes]);

    // Only filter/categorize plugin DATA here — no JSX created yet
        const { nightcordData, othersData, requiredData } = useMemo(() => {
        const nightcordData: typeof sortedPlugins = [];
        const othersData: typeof sortedPlugins = [];
        const requiredData: typeof sortedPlugins = [];

        const showApi = searchValue.status === SearchStatus.API_PLUGINS;
        for (const p of sortedPlugins) {
            if (p.hidden || (!p.settings?.def && p.name.endsWith("API") && !showApi))
                continue;

            if (!pluginFilter(p, newPluginsSet)) continue;

            const isRequired = p.required || p.isDependency || depMap[p.name]?.some(d => isPluginEnabled(d));

            if (isRequired) {
                requiredData.push(p);
            } else {
                const folderName = PluginMeta[p.name]?.folderName ?? "";
                if (folderName.startsWith("src/nightcordplugins/")) {
                    nightcordData.push(p);
                } else {
                    othersData.push(p);
                }
            }
        }
        return { nightcordData, othersData, requiredData };
    }, [sortedPlugins, searchValue, newPluginsSet, depMap, pluginFilter]);

    const allDataLength = nightcordData.length + othersData.length;
    const hasMore = visibleCount < allDataLength;

    // Store allDataLength in a ref so the observer callback always sees the latest value
    // without needing it as a dependency (which would cause reconnect loops).
    const allDataLengthRef = React.useRef(allDataLength);
    allDataLengthRef.current = allDataLength;

    // Sentinel ref and observer are now defined using a callback ref above.

    function resetCheckAndDo() {
        let restartNeeded = false;

        for (const plugin of enabledPlugins) {
            const pluginSettings = settings.plugins[plugin];

            if (Plugins[plugin].patches?.length) {
                pluginSettings.enabled = false;
                changes.handleChange(plugin);
                restartNeeded = true;
                continue;
            }

            const result = stopPlugin(Plugins[plugin]);

            if (!result) {
                logger.error(`Error while stopping plugin ${plugin}`);
                showErrorToast(`Error while stopping plugin ${plugin}`);
                continue;
            }

            pluginSettings.enabled = false;
        }

        if (restartNeeded) {
            Alerts.show({
                title: "Restart Required",
                body: (
                    <>
                        <p style={{ textAlign: "center" }}>Some plugins require a restart to fully disable.</p>
                        <p style={{ textAlign: "center" }}>Would you like to restart now?</p>
                    </>
                ),
                confirmText: "Restart Now",
                cancelText: "Later",
                onConfirm: () => relaunch()
            });
        }
    }

    function applyDefaultConfigCheckAndDo() {
        try {
            let restartNeeded = false;
            let modifiedCount = 0;

            for (const pluginName in Plugins) {
                const plugin = Plugins[pluginName];

                // Les plugins APIs ne peuvent pas être configurés directement
                if (pluginName.endsWith("API")) continue;

                const shouldBeEnabled = Boolean(plugin.required) || Boolean(plugin.enabledByDefault);
                const currentlyEnabled = isPluginEnabled(pluginName);

                if (currentlyEnabled !== shouldBeEnabled) {
                    const pluginSettings = settings.plugins[pluginName];

                    if (plugin.patches?.length) {
                        pluginSettings.enabled = shouldBeEnabled;
                        changes.handleChange(pluginName);
                        restartNeeded = true;
                        modifiedCount++;
                        continue;
                    }

                    if (shouldBeEnabled) {
                        const result = startPlugin(plugin);
                        if (!result) {
                            logger.error(`Error while starting plugin ${pluginName}`);
                            showErrorToast(`Error while starting plugin ${pluginName}`);
                        } else {
                            pluginSettings.enabled = true;
                            modifiedCount++;
                        }
                    } else {
                        const result = stopPlugin(plugin);
                        if (!result) {
                            logger.error(`Error while stopping plugin ${pluginName}`);
                            showErrorToast(`Error while stopping plugin ${pluginName}`);
                        } else {
                            pluginSettings.enabled = false;
                            modifiedCount++;
                        }
                    }
                }
            }

            if (restartNeeded) {
                Alerts.show({
                    title: "Restart Required",
                    body: (
                        <>
                            <p style={{ textAlign: "center" }}>Some plugins require a restart to apply their default configuration.</p>
                            <p style={{ textAlign: "center" }}>Would you like to restart now?</p>
                        </>
                    ),
                    confirmText: "Restart Now",
                    cancelText: "Later",
                    onConfirm: () => relaunch()
                });
            } else {
                Toasts.show({
                    message: `Default config applied. ${modifiedCount} plugin(s) modified.`,
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId(),
                    options: { position: Toasts.Position.BOTTOM }
                });
            }
        } catch (err: any) {
            Toasts.show({
                message: `Failed: ${err?.message ?? err}`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: { position: Toasts.Position.BOTTOM }
            });
            logger.error("Apply Default Config crashed:", err);
        }
    }

    // Code directly taken from supportHelper.tsx
    const { totalStockPlugins, totalUserPlugins, enabledStockPlugins, enabledUserPlugins, enabledPlugins } = useMemo(() => {
        const isApiPlugin = (plugin: string) => plugin.endsWith("API") || Plugins[plugin].required;

        const totalPlugins = Object.keys(Plugins).filter(p => !isApiPlugin(p));
        const enabledPlugins = Object.keys(Plugins).filter(p => isPluginEnabled(p) && !isApiPlugin(p));

        const totalStockPlugins = totalPlugins.filter(p => !PluginMeta[p].userPlugin && !Plugins[p].hidden).length;
        const totalUserPlugins = totalPlugins.filter(p => PluginMeta[p].userPlugin).length;
        const enabledStockPlugins = enabledPlugins.filter(p => !PluginMeta[p].userPlugin).length;
        const enabledUserPlugins = enabledPlugins.filter(p => PluginMeta[p].userPlugin).length;
        return { totalStockPlugins, totalUserPlugins, enabledStockPlugins, enabledUserPlugins, enabledPlugins };
    }, [settings.plugins]);

    // Slice DATA first, then create JSX only for visible items
    const nightcordVisibleData = nightcordData.slice(0, Math.min(visibleCount, nightcordData.length));
    const othersVisibleData = othersData.slice(0, Math.max(0, visibleCount - nightcordData.length));

    const makeCard = (p: typeof sortedPlugins[number]) => (
        <ErrorBoundary fallback={<div style={{ color: "red", padding: 8 }}>Failed to render {p.name}.</div>} key={p.name}>
            <PluginCard
                onRestartNeeded={handleRestartNeeded}
                disabled={false}
                plugin={p}
                isNew={newPluginsSet?.has(p.name)}
                hasTutorial={tutorialPlugins.has(p.name)}
            />
        </ErrorBoundary>
    );

    const makeRequiredCard = (p: typeof sortedPlugins[number]) => {
        const tooltipText = p.required || !depMap[p.name]
            ? "This plugin is required for Nightcord to function."
            : <PluginDependencyList deps={depMap[p.name]?.filter(d => isPluginEnabled(d))} />;
        return (
            <ErrorBoundary fallback={<div style={{ color: "red", padding: 8 }}>Failed to render {p.name}.</div>} key={p.name}>
                <Tooltip text={tooltipText}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <PluginCard
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            onRestartNeeded={handleRestartNeeded}
                            disabled={true}
                            plugin={p}
                            hasTutorial={tutorialPlugins.has(p.name)}
                        />
                    )}
                </Tooltip>
            </ErrorBoundary>
        );
    };

    const nightcordPlugins = nightcordVisibleData.map(makeCard);
    const othersVisible = othersVisibleData.map(makeCard);
    const requiredPlugins = requiredData.map(makeRequiredCard);

    const totalNightcordPlugins = React.useMemo(() => {
        return Object.values(Plugins).filter(p => PluginMeta[p.name]?.folderName?.startsWith("src/nightcordplugins/")).length;
    }, []);

    const totalOtherPlugins = React.useMemo(() => {
        const isNightcordPlugin = (p: string) => PluginMeta[p]?.folderName?.startsWith("src/nightcordplugins/");
        const isCorePlugin = (p: string) => PluginMeta[p]?.folderName?.startsWith("src/plugins/_");
        return Object.values(Plugins).filter(p => !isNightcordPlugin(p.name) && !isCorePlugin(p.name)).length;
    }, []);

    // Category-aware stats for the "ENABLED PLUGINS" card: reflects whichever tab
    // (NIGHTCORD / OTHERS / all) is currently selected, instead of always being global.
    const categoryStats = useMemo(() => {
        const isApiPlugin = (plugin: string) => plugin.endsWith("API") || Plugins[plugin].required;
        const isNightcordPlugin = (p: string) => PluginMeta[p]?.folderName?.startsWith("src/nightcordplugins/");
        const isUserPlugin = (p: string) => PluginMeta[p]?.userPlugin === true;

        let plugins = Object.keys(Plugins).filter(p => !isApiPlugin(p) && !Plugins[p].hidden);

        if (searchValue.status === SearchStatus.NIGHTCORD) {
            plugins = plugins.filter(isNightcordPlugin);
        } else if (searchValue.status === SearchStatus.OTHERS) {
            plugins = plugins.filter(p => !isNightcordPlugin(p));
        } else if (searchValue.status === SearchStatus.USER_PLUGINS) {
            plugins = plugins.filter(isUserPlugin);
        }

        const total = plugins.length;
        const enabled = plugins.filter(p => isPluginEnabled(p)).length;
        return { total, enabled };
    }, [settings.plugins, searchValue.status]);

    const percent = categoryStats.total > 0 ? Math.round((categoryStats.enabled / categoryStats.total) * 100) : 0;
    const strokeDashoffset = 62.83 - (62.83 * percent / 100);

    return (
        <SettingsTab>
            <div className="vc-plugins-full-width-container">
                {!premiumOnly && (
                    <div className={cl("ecosystem-banner")}>
                        <div className={cl("ecosystem-banner-text")}>
                            <HeadingTertiary>{t("Plugin Ecosystem Management")}</HeadingTertiary>
                            <Paragraph>{t("Manage your Nightcord and community plugins here. Enable, disable, and configure them to your liking.")}</Paragraph>
                        </div>
                        <div className={cl("ecosystem-banner-buttons")}>
                            <Button
                                variant="secondary"
                                size="small"
                                onClick={() => openWarningModal(null, undefined, false, enabledPlugins.length, resetCheckAndDo)}
                            >
                                {t("DISABLE ALL PLUGINS")}
                            </Button>
                            <Button
                                variant="secondary"
                                size="small"
                                onClick={() => openResetDefaultsModal(applyDefaultConfigCheckAndDo)}
                            >
                                {t("APPLY DEFAULT CONFIG")}
                            </Button>
                        </div>
                    </div>
                )}

                {!premiumOnly && (
                    <div className={cl("stats-banner")}>
                        <div className={cl("stat-item")}>
                            <div className={cl("stat-title")}>{t("TOTAL PLUGINS")}</div>
                            <div className={cl("stat-value")}>{totalStockPlugins + totalUserPlugins}</div>
                        </div>
                        <div className={cl("stat-item")}>
                            <div className={cl("stat-title")}>{t("ENABLED PLUGINS")}</div>
                            <div className={cl("stat-value")}>
                                {categoryStats.enabled} <span className={cl("stat-percent")}>({percent}%)</span>
                                <div className={cl("stat-chart")}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: "rotate(-90deg)" }}>
                                        <circle cx="12" cy="12" r="10" fill="transparent" stroke="var(--background-modifier-active)" strokeWidth="4" />
                                        <circle cx="12" cy="12" r="10" fill="transparent" stroke="var(--text-link)" strokeWidth="4" strokeDasharray="62.83" strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div 
                            className={cl("stat-item")} 
                            style={searchValue.status === SearchStatus.USER_PLUGINS ? { cursor: "pointer", transition: "0.2s" } : {}}
                            onClick={() => {
                                if (searchValue.status !== SearchStatus.USER_PLUGINS) return;
                                const native = (window as any).DiscordNative || (window as any).VesktopNative;
                                if (native?.process?.env) {
                                    const home = native.process.env.USERPROFILE || native.process.env.HOME;
                                    if (home) {
                                        const isWindows = !!native.process.env.USERPROFILE;
                                        const folderPath = isWindows ? `${home}\\Documents\\Nightcord\\userplugins` : `${home}/Documents/Nightcord/userplugins`;
                                        // Open the directory itself (will open its parent and highlight it)
                                        showItemInFolder(folderPath);
                                    }
                                }
                            }}
                            title={searchValue.status === SearchStatus.USER_PLUGINS ? "Click to open folder" : ""}
                        >
                            <div className={cl("stat-title")}>
                                {searchValue.status === SearchStatus.USER_PLUGINS ? t("USER PLUGINS") : 
                                 searchValue.status === SearchStatus.OTHERS ? t("VENCORD & EQUICORD PLUGINS") : 
                                 t("NIGHTCORD PLUGINS")}
                            </div>
                            <div className={cl("stat-value")}>
                                {searchValue.status === SearchStatus.USER_PLUGINS ? totalUserPlugins : 
                                 searchValue.status === SearchStatus.OTHERS ? totalOtherPlugins : 
                                 totalNightcordPlugins}
                            </div>
                        </div>
                    </div>
                )}

                <div className={classes(Margins.bottom20, cl("filter-controls"))}>
                    <ErrorBoundary noop>
                        <TextInput autoFocus value={searchInput} placeholder={t("Find a plugin, tag, or author...")} onChange={onSearch} />
                    </ErrorBoundary>
                    <div className={cl("filter-buttons")} style={{ minWidth: 220 }}>
                        <SearchableSelect
                            options={makeCategoryOptions(totalOtherPlugins)}
                            value={makeCategoryOptions(totalOtherPlugins).find(o => o.value === searchValue.status)?.value ?? SearchStatus.NIGHTCORD}
                            onChange={(v: any) => {
                                if (v === "community") return;
                                onStatusChange(v);
                            }}
                            closeOnSelect={true}
                            renderOptionPrefix={(o: any) => {
                                if (o?.value === SearchStatus.NIGHTCORD) return <NightcordTabIcon />;
                                if (o?.value === SearchStatus.OTHERS) return <VencordEquicordTabIcon />;
                                if (o?.value === SearchStatus.USER_PLUGINS) return <UserPluginsTabIcon />;
                                return null;
                            }}
                        />
                    </div>
                </div>

            {premiumOnly ? (
                <>
                    <HeadingTertiary className={Margins.top20}>Premium Plugins</HeadingTertiary>
                    {nightcordData.length || othersData.length
                        ? (
                            <div className={cl("grid")}>
                                {[...nightcordPlugins, ...othersVisible].length
                                    ? [...nightcordPlugins, ...othersVisible]
                                    : <Paragraph>{t("No plugins meet the search criteria.")}</Paragraph>
                                }
                            </div>
                        )
                        : <ExcludedPluginsList search={search} />
                    }
                </>
            ) : (
                <>
                    {nightcordData.length > 0 && searchValue.status === SearchStatus.NIGHTCORD && (
                        <div className={cl("grid")}>
                            {nightcordPlugins}
                        </div>
                    )}
                    


                    {othersData.length > 0 && searchValue.status === SearchStatus.OTHERS && (
                        <div className={cl("grid")}>
                            {othersVisible}
                        </div>
                    )}

                    {searchValue.status === SearchStatus.USER_PLUGINS && (
                        <>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "8px 0" }}>
                                <UserPluginsTabIcon />
                                <span style={{ color: "var(--header-primary)", fontWeight: 600, fontSize: 14 }}>
                                    {t("User Plugins — from your local folder")}
                                </span>
                            </div>
                            {nightcordPlugins.length > 0 || othersVisible.length > 0 ? (
                                <div className={cl("grid")}>
                                    {[...nightcordPlugins, ...othersVisible]}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{t("No user plugins found")}</div>
                                    <div style={{ fontSize: 13 }}>{t("Add .tsx files to your")} <code>Documents/Nightcord/userplugins/</code> {t("folder and rebuild.")}</div>
                                </div>
                            )}
                        </>
                    )}

                    {(searchValue.status !== SearchStatus.NIGHTCORD && searchValue.status !== SearchStatus.OTHERS && searchValue.status !== SearchStatus.USER_PLUGINS) && (
                        <div className={cl("grid")}>
                            {nightcordPlugins}
                            {othersVisible}
                        </div>
                    )}

                    {nightcordData.length === 0 && othersData.length === 0 && searchValue.status !== SearchStatus.USER_PLUGINS && (
                        <ExcludedPluginsList search={search} />
                    )}

                    {/* Sentinel: only rendered when there are more items to load */}
                    {hasMore && (
                        <div
                            ref={sentinelRef}
                            style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}
                        >
                            {t("Loading more plugins…")}
                        </div>
                    )}
                </>
            )}

            {!premiumOnly && requiredPlugins.length > 0 && (
                <>
                    <Divider className={Margins.top20} />

                    <HeadingTertiary className={classes(Margins.top20, Margins.bottom8)}>
                        {t("Required Plugins")}
                    </HeadingTertiary>
                    <div className={cl("grid")}>
                        {requiredPlugins.length
                            ? requiredPlugins
                            : <Paragraph>{t("No plugins meet the search criteria.")}</Paragraph>
                        }
                    </div>
                </>
            )}
            </div>
        </SettingsTab>
    );
}

export function PluginDependencyList({ deps }: { deps: string[]; }) {
    return (
        <>
            <Paragraph>{t("This plugin is required by:")}</Paragraph>
            {deps.map((dep: string) => <Paragraph key={dep} className={cl("dep-text")}>{dep}</Paragraph>)}
        </>
    );
}
