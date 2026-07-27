/*
 * Nightcord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { HeaderBarButton } from "@api/HeaderBar";
import definePlugin, { IconComponent, PluginNative } from "@utils/types";
import { FluxDispatcher, React } from "@webpack/common";

const Native = VencordNative.pluginHelpers.YoutubeInDiscord as PluginNative<any>;

// ── State ──────────────────────────────────────────────────────────────────

export let isYoutubeOpen = false;
let savedPath: string | null = null;

function saveCurrentPath() {
    savedPath = window.location.pathname + window.location.search + window.location.hash;
}

function restoreSavedPath() {
    if (savedPath) {
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath !== savedPath) {
            try {
                const WP = (Vencord as any).Webpack;
                const router = WP?.findByProps?.("transitionTo", "replaceWith");
                if (router?.transitionTo) {
                    router.transitionTo(savedPath);
                } else {
                    window.history.replaceState(null, "", savedPath);
                }
            } catch {
                try { window.history.replaceState(null, "", savedPath); } catch { }
            }
        }
    }
}

export function setYoutubeOpen(open: boolean) {
    if (isYoutubeOpen !== open) {
        if (open) {
            saveCurrentPath();
        }
        isYoutubeOpen = open;

        const container = getOrCreateIframeContainer();
        if (open) {
            container.classList.remove("ytd-container-closing", "ytd-container-hidden");
            container.style.display = "flex";
            requestAnimationFrame(() => {
                container.classList.add("ytd-container-active");
                container.style.opacity = "1";
                container.style.visibility = "visible";
                container.style.pointerEvents = "auto";
            });
            document.body.classList.add("ytd-is-open");
        } else {
            container.classList.remove("ytd-container-active");
            container.classList.add("ytd-container-closing");
            container.style.opacity = "0";
            container.style.visibility = "hidden";
            container.style.pointerEvents = "none";
            document.body.classList.remove("ytd-is-open");
            setTimeout(() => {
                container.classList.remove("ytd-container-closing");
                container.classList.add("ytd-container-hidden");
            }, 150);
        }

        FluxDispatcher.dispatch({ type: "YOUTUBE_TOGGLE", isOpen: open });

        if (!open) {
            restoreSavedPath();
        }
    }
}

function handleDiscordNavigation() {
    setYoutubeOpen(false);
}

function handleOtherPluginToggle(e: any) {
    if (e.isOpen) {
        setYoutubeOpen(false);
    }
}

// ── Icons ──────────────────────────────────────────────────────────────────

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="none" viewBox="0 0 24 24" {...props}>
            <path fill="currentColor" d="M23.5 5.65a3.02 3.02 0 0 0-2.12-2.14C19.5 3 12 3 12 3s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 5.66C0 7.55 0 11.5 0 11.5s0 3.95.5 5.85a3.02 3.02 0 0 0 2.12 2.14C4.5 20 12 20 12 20s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.15c.5-1.9.5-5.85.5-5.85s0-3.95-.5-5.85ZM9.55 15.1V7.9l6.27 3.59-6.27 3.59Z" />
        </svg>
    );
}

const YoutubeIconComponent: IconComponent = props => <YoutubeIcon {...props} />;

// ── Iframe Container ───────────────────────────────────────────────────────

function getOrCreateIframeContainer(): HTMLDivElement {
    let el = document.getElementById("ytd-global-iframe-container") as HTMLDivElement | null;
    if (!el) {
        el = document.createElement("div");
        el.id = "ytd-global-iframe-container";
        el.style.position = "fixed";
        el.style.top = "0";
        el.style.left = "72px";
        el.style.bottom = "0";
        el.style.right = "0";
        el.style.zIndex = "999";
        el.style.backgroundColor = "var(--background-primary)";
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
        el.style.display = "flex";
        el.style.flexDirection = "column";

        // Top Header Bar
        const topBar = document.createElement("div");
        topBar.style.cssText = "height:38px;background-color:#111214;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid #1e1f22;box-sizing:border-box;-webkit-app-region:drag;";

        const titleDiv = document.createElement("div");
        titleDiv.style.cssText = "display:flex;align-items:center;gap:8px;color:#f2f3f5;font-size:14px;font-weight:600;-webkit-app-region:no-drag;";
        titleDiv.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#ff0000" d="M23.5 5.65a3.02 3.02 0 0 0-2.12-2.14C19.5 3 12 3 12 3s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 5.66C0 7.55 0 11.5 0 11.5s0 3.95.5 5.85a3.02 3.02 0 0 0 2.12 2.14C4.5 20 12 20 12 20s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.15c.5-1.9.5-5.85.5-5.85s0-3.95-.5-5.85ZM9.55 15.1V7.9l6.27 3.59-6.27 3.59Z"/></svg><span>YouTube</span>`;

        const controlsContainer = document.createElement("div");
        controlsContainer.style.cssText = "display:flex;align-items:center;gap:4px;-webkit-app-region:no-drag;";

        const btnStyle = "background:transparent;color:#b5bac1;border:none;border-radius:4px;padding:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.1s,color 0.1s;";

        // Minimize Button
        const minBtn = document.createElement("button");
        minBtn.title = "Minimize";
        minBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`;
        minBtn.style.cssText = btnStyle;
        minBtn.onmouseover = () => { minBtn.style.backgroundColor = "#383a40"; minBtn.style.color = "#dbdee1"; };
        minBtn.onmouseout = () => { minBtn.style.backgroundColor = "transparent"; minBtn.style.color = "#b5bac1"; };
        minBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setYoutubeOpen(false);
        };

        // Open in External Browser Button
        const openExtBtn = document.createElement("button");
        openExtBtn.title = "Open in browser";
        openExtBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        openExtBtn.style.cssText = btnStyle;
        openExtBtn.onmouseover = () => { openExtBtn.style.backgroundColor = "#383a40"; openExtBtn.style.color = "#dbdee1"; };
        openExtBtn.onmouseout = () => { openExtBtn.style.backgroundColor = "transparent"; openExtBtn.style.color = "#b5bac1"; };
        openExtBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const iframe = document.getElementById("ytd-global-iframe") as HTMLIFrameElement;
            const targetUrl = iframe?.src || "https://www.youtube.com";
            if (typeof VencordNative !== "undefined" && (VencordNative as any)?.native?.openExternal) {
                (VencordNative as any).native.openExternal(targetUrl);
            } else {
                window.open(targetUrl, "_blank");
            }
        };

        // Close Button
        const closeBtn = document.createElement("button");
        closeBtn.title = "Close";
        closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
        closeBtn.style.cssText = btnStyle;
        closeBtn.onmouseover = () => { closeBtn.style.backgroundColor = "#da373c"; closeBtn.style.color = "#ffffff"; };
        closeBtn.onmouseout = () => { closeBtn.style.backgroundColor = "transparent"; closeBtn.style.color = "#b5bac1"; };
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setYoutubeOpen(false);
        };

        controlsContainer.appendChild(minBtn);
        controlsContainer.appendChild(openExtBtn);
        controlsContainer.appendChild(closeBtn);

        topBar.appendChild(titleDiv);
        topBar.appendChild(controlsContainer);

        const iframe = document.createElement("iframe");
        iframe.id = "ytd-global-iframe";
        iframe.src = "https://www.youtube.com";
        iframe.style.cssText = "flex:1;width:100%;height:100%;border:none;display:block;";
        iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; clipboard-read";
        iframe.setAttribute("allowfullscreen", "true");

        el.appendChild(topBar);
        el.appendChild(iframe);
        document.body.appendChild(el);

        // Hide profile panels globally when this is visible
        const style = document.createElement("style");
        style.id = "ytd-global-style";
        style.textContent = `
            body.ytd-is-open section[class^="panels_"],
            body.ytd-is-open div[class^="container_"]:has(> div[class^="nameTag_"]) {
                display: none !important;
            }
            body.ytd-is-open div[class*="wrapper_"][class*="overlay_"] {
                opacity: 0 !important;
                visibility: hidden !important;
            }
            body.ytd-is-open #youtube-button div[class*="wrapper_"][class*="overlay_"] {
                opacity: 1 !important;
                visibility: visible !important;
            }
            #ytd-global-iframe::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }
    return el;
}

function destroyContainer() {
    const container = document.getElementById("ytd-global-iframe-container");
    if (container) container.remove();
    document.body.classList.remove("ytd-is-open");
    const style = document.getElementById("ytd-global-style");
    if (style) style.remove();
}

// ── Header button ──────────────────────────────────────────────────────────

function YTHeaderBarButton() {
    return (
        <HeaderBarButton
            icon={YoutubeIconComponent}
            tooltip="YouTube In Discord"
            onClick={() => setYoutubeOpen(!isYoutubeOpen)}
        />
    );
}

// ── Plugin ─────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "YoutubeInDiscord",
    enabledByDefault: true,
    description: "Watch real YouTube inside Discord, with videos, comments, and full functionality.",
    authors: [{ name: "Nightcord", id: 0n }],

    headerBarButton: { icon: YoutubeIconComponent, render: YTHeaderBarButton },

    start() {
        const isDark = true;
        Native.installWatchingTogetherIntercept(isDark).catch(() => { });

        FluxDispatcher.subscribe("CHANNEL_SELECT", handleDiscordNavigation);
        FluxDispatcher.subscribe("GUILD_SELECT", handleDiscordNavigation);
        FluxDispatcher.subscribe("QXCHAT_TOGGLE", handleOtherPluginToggle);
        FluxDispatcher.subscribe("BROWSER_TOGGLE", handleOtherPluginToggle);
        FluxDispatcher.subscribe("NIGHTCORDNEWS_TOGGLE", handleOtherPluginToggle);
    },

    stop() {
        destroyContainer();

        FluxDispatcher.unsubscribe("CHANNEL_SELECT", handleDiscordNavigation);
        FluxDispatcher.unsubscribe("GUILD_SELECT", handleDiscordNavigation);
        FluxDispatcher.unsubscribe("QXCHAT_TOGGLE", handleOtherPluginToggle);
        FluxDispatcher.unsubscribe("BROWSER_TOGGLE", handleOtherPluginToggle);
        FluxDispatcher.unsubscribe("NIGHTCORDNEWS_TOGGLE", handleOtherPluginToggle);
    }
});
