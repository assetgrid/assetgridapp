import * as React from "react";
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
import TransactionFilterEditor from "../../../transaction/filter/TransactionFilterEditor";
import TransactionList from "../../../transaction/table/TransactionList";

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
    const navigate = useNavigate();

    const redrawTableDebounced = React.useCallback(debounce(() => { setDraw(draw => draw + 1); }, 300), []);
    React.useEffect(() => {
        redrawTableDebounced();
    }, [model.query]);

    return <>
        <Hero title="Automation" subtitle="Create new transaction automation" />
        <div className="p-3">
            <Card title="General options" isNarrow={false}>
                <InputText value={model.name}
                    disabled={isCreating}
                    label="Name"
                    onChange={e => setModel({ ...model, name: e.target.value })}
                    errors={errors.Name} />
                <InputText value={model.description}
                    disabled={isCreating}
                    label="Description"
                    onChange={e => setModel({ ...model, description: e.target.value })}
                    errors={errors.Description} />
                <InputCheckbox value={model.enabled}
                    disabled={isCreating}
                    label="Enabled"
                    onChange={e => setModel({ ...model, enabled: e.target.checked })}
                    errors={errors.Enabled}/>
            </Card>

            <Card title="Triggers" isNarrow={false}>
                <InputCheckbox value={model.triggerOnCreate}
                    disabled={isCreating}
                    label="Transaction created (including during import)"
                    onChange={e => setModel({ ...model, triggerOnCreate: e.target.checked })}
                    errors={errors.TriggerOnCreate} />
                <InputCheckbox value={model.triggerOnModify}
                    disabled={isCreating}
                    label="Transaction modified"
                    onChange={e => setModel({ ...model, triggerOnModify: e.target.checked })}
                    errors={errors.TriggerOnModify}/>
            </Card>

            <Card title="Conditions" isNarrow={false}>
                <TransactionFilterEditor query={model.query}
                    disabled={isCreating}
                    setQuery={value => setModel({ ...model, query: value })} />
            </Card>

            <Card title="Preview" isNarrow={false} collapsed={collapsePreview} setCollapsed={setCollapsePreview}>
                <p>The following existing transactions match the specified filter:</p>
                <TransactionList draw={draw} allowEditing={false} allowLinks={false} query={model.query} />
            </Card>

            <Card title="Actions" isNarrow={false}>
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
                <InputButton onClick={() => setModel({ ...model, actions: [...model.actions, { key: "set-description", value: "" }] })}>Add action</InputButton>
            </Card>

            <Card title="Create transaction automation" isNarrow={false}>
                <div className="buttons">
                    <InputButton disabled={api === null || isCreating} className="is-primary" onClick={forget(createAutomation)}>
                        Create automation
                    </InputButton>
                    <InputButton disabled={api === null || isCreating} onClick={() => setShowRunSingleModal(true)}>
                        Run on existing transactions
                    </InputButton>
                    <Link className="button" to={routes.automation()}>Cancel</Link>
                </div>
            </Card>
        </div>

        <Modal
            active={showRunSingleModal}
            title="Run automation once"
            close={() => setShowRunSingleModal(false)}
            footer={<>
                <InputButton disabled={isCreating} className="is-primary" onClick={() => forget(runSingle)()}>Run</InputButton>
                <InputButton disabled={isCreating} onClick={() => setShowRunSingleModal(false)}>Cancel</InputButton>
            </>}>
            Do you want to run this automation on pre-existing transactions? Make sure to check the preview to know which transactions will be affected.
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
        setIsCreating(false);
        setDraw(draw => draw + 1);
        setShowRunSingleModal(false);
    }
}
