/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import { DefaultTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

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
            <App />
        </PaperProvider>
    );
    
}

AppRegistry.registerComponent(appName, () => Providered);
