import { Platform } from "react-native";
import { Appbar } from "react-native-paper";



export function ApplicationBar({ customTitle, closeMenuFunction } : { customTitle ?: string , closeMenuFunction ?: () => void }) {

    const MORE_ICON = Platform.OS === 'ios' ? 'dots-horizontal' : 'dots-vertical';
    const title = customTitle ? customTitle : "Near by Share";

    if( closeMenuFunction ) {
        return (
            <Appbar.Header>
                <Appbar.Content title={title} />
                <Appbar.Action icon="close" onPress={closeMenuFunction} />
                <Appbar.Action icon={MORE_ICON} onPress={() => {}} />
            </Appbar.Header>
        )
    }


    return (
        <Appbar.Header>
            <Appbar.Content title={title} />
            <Appbar.Action icon={MORE_ICON} onPress={() => {}} />
        </Appbar.Header>
    )
}