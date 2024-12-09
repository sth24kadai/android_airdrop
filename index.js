/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import { DefaultTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const theme = {
    ...MD3LightTheme,
    myOwnProperty: true,
    colors: {
        ...DefaultTheme.colors,
    },	
}

export default function Providered() {
    return (
            <PaperProvider theme={theme}>
                <GestureHandlerRootView>
                    <App />
                </GestureHandlerRootView>
            </PaperProvider>
    );
    
}

AppRegistry.registerComponent(appName, () => Providered);
