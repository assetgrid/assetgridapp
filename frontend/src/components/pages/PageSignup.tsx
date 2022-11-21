import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import * as Api from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { forget } from "../../lib/Utils";
import Card from "../common/Card";
import InputButton from "../input/InputButton";
import InputText from "../input/InputText";

export default function PageSignup (): React.ReactElement {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [state, setState] = React.useState<"signing-up" | "waiting">("waiting");
    const navigate = useNavigate();
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const { t } = useTranslation();

    React.useEffect(() => {
        Api.anyUsers().then(result => {
            if (result.status === 200 && result.data) {
                navigate(routes.dashboard());
            }
        }).catch(null);
    }, []);

    return <section className="page-login">
        <Card title={t("user.create_new_account_for_assetgrid")!} isNarrow={true}>
            <InputText value={email}
                label={t("user.email")!}
                onChange={e => setEmail(e.target.value)}
                disabled={state === "signing-up"}
                errors={errors.Email !== undefined ? errors.email : Object.keys(errors).length > 0} />
            <InputText value={password}
                password={true}
                label={t("user.password")!}
                disabled={state === "signing-up"}
                onChange={e => setPassword(e.target.value)} errors={errors.Password !== undefined ? errors.Password : Object.keys(errors).length > 0} />
            <InputButton
                className="is-primary"
                disabled={state === "signing-up"}
                onClick={forget(signUp)}>
                {t("user.sign_up")!}
            </InputButton>
        </Card>
    </section>;

    async function signUp (): Promise<void> {
        setState("signing-up");
        const result = await Api.signup(email, password);
        if (result.status === 200) {
            setPassword("");
            navigate(routes.login());
        } else if (result.status === 400) {
            setState("waiting");
            setErrors(result.errors);
        }
    }
}
