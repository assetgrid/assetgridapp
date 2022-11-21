import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router";
import { Link } from "react-router-dom";
import { useApi } from "../../../../lib/ApiClient";
import { routes } from "../../../../lib/routes";
import { debounce, emptyQuery, forget } from "../../../../lib/Utils";
import { TransactionAutomation } from "../../../../models/automation/transactionAutomation";
import Card from "../../../common/Card";
import Hero from "../../../common/Hero";
import Modal from "../../../common/Modal";
import InputButton from "../../../input/InputButton";
import InputCheckbox from "../../../input/InputCheckbox";
import InputText from "../../../input/InputText";
import TransactionActionEditor from "../../../transaction/automation/TransactionActionEditor";
import TransactionFilterEditor from "../../../transaction/TransactionFilterEditor";
import TransactionList from "../../../transaction/table/TransactionList";
import Page404 from "../../Page404";
import PageError from "../../PageError";
import { useQueryClient } from "@tanstack/react-query";

interface LocationState {
    expandPreview?: boolean
}

export default function PageAutomationTransactionModify (): React.ReactElement {
    const api = useApi();
    const [isSaving, setIsSaving] = React.useState(false);
    const locationState = useLocation().state as LocationState | undefined;
    const [collapsePreview, setCollapsePreview] = React.useState(locationState?.expandPreview !== true);
    const [model, setModel] = React.useState<TransactionAutomation | null | "not found">(null);
    const [draw, setDraw] = React.useState(0);
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const idString = useParams().id;
    const id = idString === undefined ? NaN : Number.parseInt(idString);
    const [changesSaved, setChangesSaved] = React.useState(false);
    const [showRunSingleModal, setShowRunSingleModal] = React.useState(false);
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    React.useEffect(() => {
        if (!isNaN(id) && api !== null) forget(getModel)();
    }, [id, api]);

    if (isNaN(id)) {
        return <PageError />;
    }
    if (model === "not found") {
        return <Page404 />;
    }

    const redrawTableDebounced = React.useCallback(debounce(() => { setDraw(draw => draw + 1); }, 300), []);
    React.useEffect(() => {
        redrawTableDebounced();
    }, [model?.query]);

    return <>
        <Hero title={t("automation.modify", { name: model?.name })} subtitle={model?.description ?? <>&hellip;</>} />
        <div className="p-3">
            <Card title={t("common.general_options")!} isNarrow={false}>
                <InputText value={model?.name ?? "…"}
                    disabled={model === null || isSaving}
                    label={t("common.name")!}
                    onChange={e => model !== null && setModel({ ...model, name: e.target.value })}
                    errors={errors.Name} />
                <InputText value={model?.description ?? "…"}
                    disabled={model === null || isSaving}
                    label={t("common.description")!}
                    onChange={e => model !== null && setModel({ ...model, description: e.target.value })}
                    errors={errors.Description} />
                <InputCheckbox value={model?.enabled ?? true}
                    disabled={model === null || isSaving}
                    label={t("common.enabled")!}
                    onChange={e => model !== null && setModel({ ...model, enabled: e.target.checked })}
                    errors={errors.Enabled}/>
            </Card>

            <Card title={t("automation.triggers")!} isNarrow={false}>
                <InputCheckbox value={model?.triggerOnCreate ?? true}
                    disabled={model === null || isSaving}
                    label={t("automation.trigger_transaction_created")!}
                    onChange={e => model !== null && setModel({ ...model, triggerOnCreate: e.target.checked })}
                    errors={errors.TriggerOnCreate} />
                <InputCheckbox value={model?.triggerOnModify ?? true}
                    disabled={model === null || isSaving}
                    label={t("automation.trigger_transaction_modified")!}
                    onChange={e => model !== null && setModel({ ...model, triggerOnModify: e.target.checked })}
                    errors={errors.TriggerOnModify}/>
            </Card>

            <Card title={t("automation.conditions")!} isNarrow={false}>
                <TransactionFilterEditor query={model?.query ?? emptyQuery}
                    disabled={model === null || isSaving}
                    setQuery={value => model !== null && setModel({ ...model, query: value })} />
            </Card>

            <Card title={t("automation.preview")!} isNarrow={false} collapsed={collapsePreview} setCollapsed={setCollapsePreview}>
                <p>{t("automations.matching_filter")}</p>
                {model !== null && <TransactionList draw={draw} allowEditing={false} allowLinks={false} query={model.query} />}
            </Card>

            <Card title={t("automation.actions")!} isNarrow={false}>
                {(model?.actions ?? []).map((action, index) => <TransactionActionEditor
                    key={index}
                    action={action}
                    onChange={value => model !== null && setModel({
                        ...model,
                        actions: [
                            ...model.actions.slice(0, index),
                            value,
                            ...model.actions.slice(index + 1)
                        ]
                    })}
                    delete={(model?.actions.length ?? 0) > 1 ? () => model !== null && setModel({ ...model, actions: model.actions.filter((_, i) => i !== index) }) : undefined}
                    disabled={model === null || isSaving} />
                )}
                <InputButton onClick={() => model !== null && setModel({ ...model, actions: [...model.actions, { key: "set-description", value: "" }] })}>
                    {t("automation.add_action")!}
                </InputButton>
            </Card>

            <Card title={t("common.save_changes")!} isNarrow={false}>
                {changesSaved && <article className="message is-link">
                    <div className="message-body">
                        {t("common.changes_have_been_saved")}
                    </div>
                </article>}
                <div className="buttons">
                    <InputButton disabled={api === null || model === null || isSaving} className="is-primary" onClick={forget(saveChanges)}>
                        {t("common.save_changes")}
                    </InputButton>
                    <InputButton disabled={api === null || model === null || isSaving} onClick={() => setShowRunSingleModal(true)}>
                        {t("automation.transaction.run_on_existing")!}
                    </InputButton>
                    <Link className="button" to={routes.automation()}>{t("common.cancel")}</Link>
                </div>
            </Card>
        </div>

        <Modal
            active={showRunSingleModal}
            title="Run automation once"
            close={() => setShowRunSingleModal(false)}
            footer={<>
                <InputButton disabled={isSaving} className="is-primary" onClick={() => forget(runSingle)()}>Run</InputButton>
                <InputButton disabled={isSaving} onClick={() => setShowRunSingleModal(false)}>Cancel</InputButton>
            </>}>
            {t("automation.transaction.confirm_existing")!}
        </Modal>
    </>;

    async function saveChanges (): Promise<void> {
        if (api === null || model === "not found" || model === null) return;

        setErrors({});
        setIsSaving(true);
        setChangesSaved(false);
        const result = await api.Automation.Transaction.modify(id, model);
        switch (result.status) {
            case 200:
                setChangesSaved(true);
                break;
            case 400:
                setErrors(result.errors);
                break;
        }
        setIsSaving(false);
    }

    async function getModel (): Promise<void> {
        if (api === null) return;

        setIsSaving(true);
        const result = await api.Automation.Transaction.get(id);
        switch (result.status) {
            case 200:
                setModel(result.data);
                break;
            case 404:
                setModel("not found");
                break;
        }
        setIsSaving(false);
    }

    async function runSingle (): Promise<void> {
        if (api === null || model === "not found" || model === null) return;

        setIsSaving(true);
        await api.Automation.Transaction.runSingle(model);
        await queryClient.invalidateQueries(["transaction"]);
        setIsSaving(false);
        setDraw(draw => draw + 1);
        setShowRunSingleModal(false);
    }
}
