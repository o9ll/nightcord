import {
    addBadgeVisibilityListener,
    BadgeSource,
    getOwnHiddenBadgeSources,
    removeBadgeVisibilityListener,
    setOwnHiddenBadgeSources,
} from "@api/BadgeVisibility";
import { useSettings } from "@api/Settings";
import { beginDiscordOAuth, checkOAuthToken, clearToken, getStoredToken, storeToken } from "@api/OAuth2";
import { authorizeCloud, deauthorizeCloud } from "@api/SettingsSync/cloudSetup";
import { deleteCloudSettings, eraseAllCloudData, getCloudSettings, putCloudSettings } from "@api/SettingsSync/cloudSync";

import { Button } from "@components/Button";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { CloudDownloadIcon, CloudUploadIcon, DeleteIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";

import { localStorage } from "@utils/localStorage";
import { Margins } from "@utils/margins";
import { openModal } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy } from "@webpack";
import { Alerts, React, SearchableSelect, Select, useState, OAuth2AuthorizeModal } from "@webpack/common";
import { t } from "@api/i18n";

const ICON_STYLE: React.CSSProperties = { width: 20, height: 20, borderRadius: 4, verticalAlign: "middle" };
const NIGHTCORD_ICON_STYLE: React.CSSProperties = { width: 20, height: 20, borderRadius: 4, verticalAlign: "middle" };

const NIGHTCORD_ICON_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAAGFBMVEVEQZ5HcEzOytnl5OVxZZB+TaD9/f0lJSU8wVUpAAAABXRSTlPzAPR0MBK4e24AAAK1SURBVHiclZVNb+IwEIYHRH5ACrvnyCjm3LLi3FRVz95sHa6Vqwx3JDZ/f+crgYSsqvpAAvPwznj82ob8iwHfA9ZuW80C66dHeR4Q034GWHv8lG8+IeL2Dth4dMgSazxeasTHKXDAtvMf9PKQuq67+GICvCD93qSFAZ1vF2MA07HrzrjK87d2DqDELIwkfFCgmACiS/+rcr/jN5wAmliKMK0wC5zxvU8Wfs8BVIQmOyeYKEhlXMSLAH8TVCPgpwFNauStaSfAmwFn9CdVgnwWuCDutA3ZGDgY0Pm+Y3/2zu1/3QONAQ5lmHUIOBlw1lly0DlP1qkM2Blw0VkilhEAopnoBuhKnW0MISMCvDgHbIV4HKXUGDOJE/FxBS7dIEMCQYGGjWFA3ccvkQYo4dvVADS7KzAo+EKBoyyAASxgRIZBAGlPk64ZeoWlOKcH5FMFaBoKiDFgY8DuJgNwodCIMQagHeYQQ83dpjbwuoMa0WMagBBlsRwWt4CTh5bQoIu8pCFTQBpc4mkAfOISfSnmpRrKI9vIp1g7BUhbe7nQtcDkHIYl55V4jcDlPwOY7TmSYMUWUcA2xqsZJq+dS0W2+EERrXG0MUC0aP2qDbWuB8bnw4Y7G+i5HFJI6GVrAJ9Sr3KWGYCyMdZolrs5JbGfppxsyX9OgA32jaIvT1gscTE5aRUIDW73jmaesdQI8KVJcGsKNmU1Bg6t+qGm7hZsazqWRsCbTiNCFs1072PgIZlnzdZcxAhYY3njSdlb1fi+8K0qZAOwGANWRB9f0pk6uXE4x7UGT1tncmf5dKOwxBYmCuSecqghI4E7gAxYZlFSULwl102BB0xlsP8ntu3dvUnrwOamblMCmLlYnz3aCGLu+5sX9JxMFF/lc8AGaAc5Xq1VPgsQoWOV/weQjRCC7Y0vb/9/ba6Lpu1hqjcAAAAASUVORK5CYII="

function NightcordIcon() {
    return <img src={NIGHTCORD_ICON_DATA_URI} alt="Nightcord" style={NIGHTCORD_ICON_STYLE} />;
}

function EquicordIcon() {
    return <img src="https://equicord.org/assets/favicon.png" alt="Equicord" style={ICON_STYLE} />;
}

function VencordIcon() {
    return <img src="https://equicord.org/assets/icons/vencord/icon-light.png" alt="Vencord" style={ICON_STYLE} />;
}

function GlobalBadgesIcon() {
    return <img src="https://equicord.org/assets/icons/misc/userplugin.png" alt="GlobalBadges" style={ICON_STYLE} />;
}

const RefreshIcon = findComponentByCodeLazy("M4 12a8 8 0 0 1 14.93-4H15");
const TrashIcon = findComponentByCodeLazy("2.81h8.36a3");

function validateUrl(url: string) {
    try {
        new URL(url);
        return true;
    } catch {
        return "Invalid URL";
    }
}

const cloudBackendOptions = [
    { label: "Equicord Cloud", value: "https://cloud.equicord.org/" },
    { label: "Vencord Cloud", value: "https://api.vencord.dev/" }
];

const syncDirectionOptions = [
    { label: "Two-way sync (changes go both directions)", value: "both" },
    { label: "This device is the source (upload only)", value: "push" },
    { label: "The cloud is the source (download only)", value: "pull" },
    { label: "Do not sync automatically (manual sync via buttons below only)", value: "manual" }
];

const BADGE_OPTIONS: Array<{ label: string; value: BadgeSource }> = [
    { label: "Nightcord Badges", value: "nightcord" },
    { label: "Equicord Badges", value: "equicord" },
    { label: "Vencord Badges", value: "vencord" },
    { label: "GlobalBadges", value: "globalbadges" },
];

function renderPrefix(option: { value: BadgeSource }) {
    switch (option.value) {
        case "nightcord": return <NightcordIcon />;
        case "equicord": return <EquicordIcon />;
        case "vencord": return <VencordIcon />;
        case "globalbadges": return <GlobalBadgesIcon />;
        default: return null;
    }
}

function CustomProfileSyncToggle() {
    const settings = useSettings();
    const [token, setToken] = React.useState<string | null>(null);
    const [checking, setChecking] = React.useState(true);
    const [busy, setBusy] = React.useState(false);

    React.useEffect(() => {
        let isMounted = true;
        getStoredToken().then(async t => {
            if (!isMounted) return;
            if (t) {
                const check = await checkOAuthToken(t);
                if (!isMounted) return;
                if (check?.valid) {
                    setToken(t);
                    settings.syncOwnCustomProfile = true;
                    settings.seeAllCustomProfile = true;
                } else {
                    await clearToken();
                    if (!isMounted) return;
                    settings.syncOwnCustomProfile = false;
                    settings.seeAllCustomProfile = false;
                }
            } else {
                settings.syncOwnCustomProfile = false;
                settings.seeAllCustomProfile = false;
            }
            setChecking(false);
        });
        return () => { isMounted = false; };
    }, []);

    const isEnabled = !!token;

    async function handleToggle(on: boolean) {
        if (busy) return;
        if (on) {
            setBusy(true);
            let oauthData: { url: string; redirectUri: string; scopes: string[]; clientId?: string; } | null = null;
            try {
                oauthData = await beginDiscordOAuth();
            } catch (e) {
                console.error("[CustomProfileSync] Failed to fetch OAuth config:", e);
                setBusy(false);
                return;
            }
            setBusy(false);

            let clientId = oauthData.clientId;
            if (!clientId) {
                try {
                    clientId = new URL(oauthData.url).searchParams.get("client_id") ?? undefined;
                } catch { }
            }
            if (!clientId) return;

            openModal(oauthProps => <OAuth2AuthorizeModal
                {...oauthProps}
                scopes={oauthData!.scopes}
                responseType="code"
                redirectUri={oauthData!.redirectUri}
                permissions={0n}
                clientId={clientId!}
                cancelCompletesFlow={false}
                callback={async ({ location }: any) => {
                    if (!location) return;
                    try {
                        const res = await fetch(location, { headers: { Accept: "application/json" } });
                        const { token: newToken } = await res.json();
                        if (newToken) {
                            await storeToken(newToken);
                            setToken(newToken);
                            settings.syncOwnCustomProfile = true;
                            settings.seeAllCustomProfile = true;
                        }
                    } catch (e) {
                        console.error("[CustomProfileSync] OAuth callback failed:", e);
                    }
                }}
            />);
        } else {
            setBusy(true);
            await clearToken();
            setToken(null);
            settings.syncOwnCustomProfile = false;
            settings.seeAllCustomProfile = false;
            setBusy(false);
        }
    }

    if (checking) return null;

    return (
        <div style={{ marginBottom: 16 }}>
            <FormSwitch
                value={isEnabled}
                onChange={handleToggle}
                title={t("Nightcord Sync")}
                description={isEnabled
                    ? t("Your custom profile is synced. Other Nightcord users can see your profile, and you can see theirs.")
                    : t("Enable to share your custom profile with other Nightcord users and see their profiles.")}
                disabled={busy}
            />

            {isEnabled && (
                <div style={{ marginTop: 4 }}>
                    <a role="button" onClick={async () => {
                        await clearToken();
                        setToken(null);
                        settings.syncOwnCustomProfile = false;
                        settings.seeAllCustomProfile = false;
                    }} style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
                        {t("Disconnect account")}
                    </a>
                </div>
            )}
        </div>
    );
}

function CloudIntegrationSection() {
    const settings = useSettings(["cloud.authenticated", "cloud.url", "cloud.settingsSync"]);
    const [inputKey, setInputKey] = useState(0);
    const forceUpdate = useForceUpdater();

    const { cloud } = settings;
    const isAuthenticated = cloud.authenticated;
    const syncEnabled = isAuthenticated && cloud.settingsSync;

    async function changeUrl(url: string) {
        cloud.url = url;
        cloud.authenticated = false;

        await deauthorizeCloud();
        await authorizeCloud();

        setInputKey(prev => prev + 1);
    }

    return (
        <>
            <Heading className={Margins.top16}>{t("Cloud Integration")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Nightcord's cloud integration allows you to sync your settings across multiple devices and Discord installations. Your data is securely stored and can be easily restored at any time.")}
            </Paragraph>

            <Notice.Info className={Margins.bottom16}>
                {t("We use our own Nightcord Cloud backend with enhanced features.")}
                {" "}
                {t("View our privacy policy to see what we store and how we use your data.")}
            </Notice.Info>

            <FormSwitch
                title={t("Enable Cloud Integration")}
                description={t("Connect to the cloud backend for settings synchronization. This will request authorization if you haven't set up cloud integration yet.")}
                value={isAuthenticated}
                onChange={v => {
                    if (v)
                        authorizeCloud();
                    else
                        cloud.authenticated = v;
                }}
                hideBorder
            />

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>{t("Cloud Backend")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Choose which cloud backend to use for storing your settings.")}
            </Paragraph>

            <div className={Margins.bottom8}>
                <SearchableSelect
                    options={cloudBackendOptions}
                    value={cloudBackendOptions.find(o => o.value === cloud.url)?.value}
                    onChange={v => changeUrl(v)}
                    closeOnSelect={true}
                    renderOptionPrefix={o => {
                        if (o?.value?.includes("nightcord")) return <NightcordIcon />;
                        if (o?.value?.includes("equicord")) return <EquicordIcon />;
                        return <VencordIcon />;
                    }}
                />
            </div>

            <Flex gap="8px" alignItems="center">
                <div style={{ flex: 1 }}>
                    <CheckedTextInput
                        key={"backendUrl-" + inputKey}
                        value={cloud.url}
                        onChange={async v => {
                            cloud.url = v;
                            cloud.authenticated = false;
                            await deauthorizeCloud();
                        }}
                        validate={validateUrl}
                    />
                </div>
                <Button
                    disabled={!isAuthenticated}
                    onClick={async () => {
                        cloud.authenticated = false;
                        await deauthorizeCloud();
                        await authorizeCloud();
                    }}
                >
                    <Flex gap="8px" alignItems="center">
                        <RefreshIcon color="currentColor" />
                        {t("Reauthorize")}
                    </Flex>
                </Button>
            </Flex>

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>{t("Settings Sync")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Synchronize your Nightcord settings to the cloud. This makes it easy to keep your configuration consistent across multiple devices without manual import/export.")}
            </Paragraph>

            <FormSwitch
                title={t("Enable Settings Sync")}
                description={t("When enabled, your settings can be synced to and from the cloud. Use the actions below to manually sync.")}
                value={cloud.settingsSync}
                onChange={v => { cloud.settingsSync = v; }}
                disabled={!isAuthenticated}
                hideBorder
            />

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>{t("Sync Rules for This Device")}</Heading>
            <Paragraph className={Margins.bottom16}>
                <span dangerouslySetInnerHTML={{ __html: t("This setting controls how settings move between <strong>this device</strong> and the cloud. You can let changes flow both ways, or choose one place to be the main source of truth.") }} />
            </Paragraph>

            <Select
                options={syncDirectionOptions}
                isSelected={v => v === (localStorage.Vencord_cloudSyncDirection ?? "both")}
                select={v => {
                    localStorage.Vencord_cloudSyncDirection = v;
                    forceUpdate();
                }}
                serialize={v => v}
                isDisabled={!syncEnabled}
            />

            <Flex gap="8px" className={Margins.top16}>
                <Button
                    style={{ flex: 1 }}
                    disabled={!syncEnabled}
                    onClick={() => putCloudSettings(true)}
                >
                    <Flex gap="8px" alignItems="center">
                        <CloudUploadIcon />
                        {t("Sync to Cloud")}
                    </Flex>
                </Button>
                <Button
                    style={{ flex: 1 }}
                    disabled={!syncEnabled}
                    onClick={() => getCloudSettings(true, true)}
                >
                    <Flex gap="8px" alignItems="center">
                        <CloudDownloadIcon />
                        {t("Sync from Cloud")}
                    </Flex>
                </Button>
            </Flex>

            {!isAuthenticated && (
                <Notice.Warning className={Margins.top8}>
                    {t("Enable cloud integration above to use settings sync features.")}
                </Notice.Warning>
            )}

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>{t("Danger Zone")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Permanently delete all your data from the cloud. This action cannot be undone and will remove all synced settings and any other data stored on the cloud backend.")}
            </Paragraph>

            <Flex gap="8px">
                <Button
                    variant="dangerPrimary"
                    size="medium"
                    disabled={!syncEnabled}
                    onClick={() => deleteCloudSettings()}
                >
                    <Flex gap="8px" alignItems="center">
                        <TrashIcon color="currentColor" />
                        {t("Delete Cloud Settings")}
                    </Flex>
                </Button>
                <Button
                    variant="dangerSecondary"
                    size="medium"
                    disabled={!isAuthenticated}
                    onClick={() => Alerts.show({
                        title: t("Delete Cloud Account"),
                        body: t("Are you sure you want to permanently delete your cloud account and all associated data? This action cannot be undone."),
                        onConfirm: eraseAllCloudData,
                        confirmText: t("Delete Cloud Account"),
                        confirmColor: "vc-cloud-erase-data-danger-btn",
                        cancelText: t("Cancel")
                    })}
                >
                    <Flex gap="8px" alignItems="center">
                        <DeleteIcon />
                        {t("Delete Cloud Account")}
                    </Flex>
                </Button>
            </Flex>
        </>
    );
}

function SyncTab() {
    const [hidden, setHidden] = useState<BadgeSource[]>(getOwnHiddenBadgeSources());
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        const listener = () => setHidden([...getOwnHiddenBadgeSources()]);
        addBadgeVisibilityListener(listener);
        return () => removeBadgeVisibilityListener(listener);
    }, []);

    async function onChange(next: BadgeSource[]) {
        setHidden(next);
        setSaving(true);
        try {
            await setOwnHiddenBadgeSources(next);
        } finally {
            setSaving(false);
        }
    }

    return (
        <SettingsTab>
            <CustomProfileSyncToggle />

            <Divider className={Margins.bottom16} />

            <CloudIntegrationSection />

            <Divider className={Margins.bottom16} />

            <Heading className={Margins.top16}>{t("Badges")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Choose which badge sources to hide on your own profile. Selected sources disappear from your profile for everyone — including yourself — wherever it's viewed.")}
            </Paragraph>

            <Notice.Info className={Margins.bottom16}>
                {t("This only affects your own profile. The first time you select a badge to hide, you'll be asked to sign in with Discord so your preference can be shared with others viewing your profile.")}
            </Notice.Info>

            <Divider className={Margins.bottom16} />

            <Heading className={Margins.bottom8} style={{ fontSize: 14 }}>{t("Hidden Badge Sources")}</Heading>
            <div className={Margins.bottom8}>
                <SearchableSelect
                    multi
                    closeOnSelect={false}
                    options={BADGE_OPTIONS}
                    value={hidden}
                    placeholder={t("None hidden")}
                    onChange={onChange}
                    renderOptionPrefix={renderPrefix}
                />
            </div>

            {saving && (
                <Paragraph className={Margins.top8} style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {t("Saving...")}
                </Paragraph>
            )}
        </SettingsTab>
    );
}

export default wrapTab(SyncTab, "Synchronization");
