import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import * as Api from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { forget } from "../../lib/Utils";
import { userContext } from "../App";
import Card from "../common/Card";
import InputButton from "../input/InputButton";
import InputText from "../input/InputText";

export default function PageLogin (): React.ReactElement {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [state, setState] = React.useState<"signing-in" | "waiting" | "error">("waiting");
    const { setUser } = React.useContext(userContext);
    const navigate = useNavigate();
    const { t } = useTranslation();

    React.useEffect(() => {
        Api.anyUsers().then(result => {
            if (result.status === 200 && !result.data) {
                navigate(routes.signup());
            }
        }).catch(null);
    }, []);

    return <section className="page-login">
        <Card title={t("login.sign_in_to_assetgrid")!} isNarrow={true}>
            <InputText
                value={email}
                label={t("user.email")!}
                disabled={state === "signing-in"}
                onChange={e => setEmail(e.target.value)} errors={state === "error"} />
            <InputText
                value={password}
                password={true}
                label={t("user.password")!}
                disabled={state === "signing-in"}
                onChange={e => setPassword(e.target.value)} errors={state === "error" ? [t("user.invalid_username_or_password")] : undefined} />
            <InputButton
                className="is-primary"
                disabled={state === "signing-in"}
                onClick={forget(signIn)!}>
                {t("user.sign_in")}
            </InputButton>
        </Card>
    </section>;

    async function signIn (): Promise<void> {
        setState("signing-in");
        const result = await Api.authenticate(email, password);
        setPassword("");
        if (result.status === 200) {
            setState("waiting");
            setUser(result.data);
            navigate(routes.dashboard());
        } else {
            setState("error");
        }
    }
}
