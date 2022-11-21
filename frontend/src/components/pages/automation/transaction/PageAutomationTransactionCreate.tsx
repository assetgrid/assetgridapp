import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { Link } from "react-router-dom";
import { useApi } from "../../../../lib/ApiClient";
import { routes } from "../../../../lib/routes";
import { debounce, emptyQuery, forget } from "../../../../lib/Utils";
import { TransactionAutomation, TransactionAutomationPermissions } from "../../../../models/automation/transactionAutomation";
import Card from "../../../common/Card";
import Hero from "../../../common/Hero";
import Modal from "../../../common/Modal";
import InputButton from "../../../input/InputButton";
import InputCheckbox from "../../../input/InputCheckbox";
import InputText from "../../../input/InputText";
import TransactionActionEditor from "../../../transaction/automation/TransactionActionEditor";
import TransactionFilterEditor from "../../../transaction/TransactionFilterEditor";
import TransactionList from "../../../transaction/table/TransactionList";
import { useQueryClient } from "@tanstack/react-query";

interface LocationState {
    expandPreview?: boolean
}

export default function PageAutomationTransactionCreate (): React.ReactElement {
    const api = useApi();
    const [isCreating, setIsCreating] = React.useState(false);
    const locationState = useLocation().state as LocationState | undefined;
    const [collapsePreview, setCollapsePreview] = React.useState(locationState?.expandPreview !== true);
    const [model, setModel] = React.useState<TransactionAutomation>({
        actions: [{ key: "set-description", value: "" }],
        description: "",
        name: "",
        enabled: true,
        query: emptyQuery,
        triggerOnCreate: true,
        triggerOnModify: true,
        permissions: TransactionAutomationPermissions.Modify
    });
    const [draw, setDraw] = React.useState(0);
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const [showRunSingleModal, setShowRunSingleModal] = React.useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const redrawTableDebounced = React.useCallback(debounce(() => { setDraw(draw => draw + 1); }, 300), []);
    React.useEffect(() => {
        redrawTableDebounced();
    }, [model.query]);

    return <>
        <Hero title={t("automation.automation")} subtitle={t("automation.transaction.create_new")} />
        <div className="p-3">
            <Card title={t("common.general_options")!} isNarrow={false}>
                <InputText value={model.name}
                    disabled={isCreating}
                    label={t("common.name")!}
                    onChange={e => setModel({ ...model, name: e.target.value })}
                    errors={errors.Name} />
                <InputText value={model.description}
                    disabled={isCreating}
                    label={t("common.description")!}
                    onChange={e => setModel({ ...model, description: e.target.value })}
                    errors={errors.Description} />
                <InputCheckbox value={model.enabled}
                    disabled={isCreating}
                    label={t("common.enabled")!}
                    onChange={e => setModel({ ...model, enabled: e.target.checked })}
                    errors={errors.Enabled}/>
            </Card>

            <Card title={t("automation.triggers")!} isNarrow={false}>
                <InputCheckbox value={model.triggerOnCreate}
                    disabled={isCreating}
                    label={t("automation.trigger_transaction_created")!}
                    onChange={e => setModel({ ...model, triggerOnCreate: e.target.checked })}
                    errors={errors.TriggerOnCreate} />
                <InputCheckbox value={model.triggerOnModify}
                    disabled={isCreating}
                    label={t("automation.trigger_transaction_modified")!}
                    onChange={e => setModel({ ...model, triggerOnModify: e.target.checked })}
                    errors={errors.TriggerOnModify}/>
            </Card>

            <Card title={t("automation.conditions")!} isNarrow={false}>
                <TransactionFilterEditor query={model.query}
                    disabled={isCreating}
                    setQuery={value => setModel({ ...model, query: value })} />
            </Card>

            <Card title={t("automation.preview")!} isNarrow={false} collapsed={collapsePreview} setCollapsed={setCollapsePreview}>
                <p>{t("automations.matching_filter")}</p>
                <TransactionList draw={draw} allowEditing={false} allowLinks={false} query={model.query} />
            </Card>

            <Card title={t("automation.actions")!} isNarrow={false}>
                {model.actions.map((action, index) => <TransactionActionEditor
                    key={index}
                    action={action}
                    onChange={value => setModel({
                        ...model,
                        actions: [
                            ...model.actions.slice(0, index),
                            value,
                            ...model.actions.slice(index + 1)
                        ]
                    })}
                    delete={model.actions.length > 1 ? () => setModel({ ...model, actions: model.actions.filter((_, i) => i !== index) }) : undefined}
                    disabled={isCreating} />
                )}
                <InputButton onClick={() => setModel({ ...model, actions: [...model.actions, { key: "set-description", value: "" }] })}>
                    {t("automation.add_action")!}
                </InputButton>
            </Card>

            <Card title={t("automation.transaction.create")!} isNarrow={false}>
                <div className="buttons">
                    <InputButton disabled={api === null || isCreating} className="is-primary" onClick={forget(createAutomation)}>
                        {t("automation.create")!}
                    </InputButton>
                    <InputButton disabled={api === null || isCreating} onClick={() => setShowRunSingleModal(true)}>
                        {t("automation.transaction.run_on_existing")!}
                    </InputButton>
                    <Link className="button" to={routes.automation()}>{t("common.cancel")!}</Link>
                </div>
            </Card>
        </div>

        <Modal
            active={showRunSingleModal}
            title={t("automation.run_once")!}
            close={() => setShowRunSingleModal(false)}
            footer={<>
                <InputButton disabled={isCreating} className="is-primary" onClick={() => forget(runSingle)()}>{t("automation.run")!}</InputButton>
                <InputButton disabled={isCreating} onClick={() => setShowRunSingleModal(false)}>{t("common.cancel")!}</InputButton>
            </>}>
            {t("automation.transaction.confirm_existing")!}
        </Modal>
    </>;

    async function createAutomation (): Promise<void> {
        if (api === null) return;

        setErrors({});
        setIsCreating(true);
        const result = await api.Automation.Transaction.create(model);
        switch (result.status) {
            case 200:
                navigate(routes.automation());
                break;
            case 400:
                setErrors(result.errors);
                break;
        }
        setIsCreating(false);
    }

    async function runSingle (): Promise<void> {
        if (api === null) return;

        setIsCreating(true);
        await api.Automation.Transaction.runSingle(model);
        await queryClient.invalidateQueries(["transaction"]);
        setIsCreating(false);
        setDraw(draw => draw + 1);
        setShowRunSingleModal(false);
    }
}
