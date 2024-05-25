import React, { Component } from 'react'
import {
	Platform,
	StyleSheet,
	TouchableOpacity,
	Text,
	FlatList,
	RefreshControl,
	View,
	TextBase,
	ScrollView as RNScrollView,
} from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeAreaView from 'react-native-safe-area-view';

import { Button, ListItem } from 'react-native-elements'
import Zeroconf, { Service } from 'react-native-zeroconf'
import { AnimatedText } from './components/animated_text';
import { ScrollView } from 'react-native-gesture-handler';
//@ts-ignore

const zeroconf = new Zeroconf()

interface State {
	isScanning: boolean
	selectedService: string | null
	services: { [key: string]: Service }
	logs: {
		emoji: string,
		message: string
	}[],
	showLogs: boolean
}

export default class App extends Component {
	public state: State = {
		isScanning: false,
		selectedService: null,
		services: {} as { [key: string]: Service },
		logs: [],
		showLogs: false
	}
	public timeout: NodeJS.Timeout | undefined = void 0

	componentDidMount() {
		this.refreshData()

		zeroconf.on('start', () => {
			this.setState({ isScanning: true })
			this.state.logs.push({
				emoji: '🔍',
				message: 'Started scanning and lunching the mDNS service...'
			})

			zeroconf.publishService('http', 'tcp', 'local', 'airdrop_like_', 80)
		})

		zeroconf.on('stop', () => {
			this.setState({ isScanning: false })
			this.state.logs.push({
				emoji: '🛑',
				message: 'Stopped scanning'
			})
		})

		zeroconf.on('update', () => {
			this.state.logs.push({
				emoji: '🔄',
				message: 'Updating Data...'
			})
		})

		zeroconf.on('resolved', service => {
			this.state.logs.push({
				emoji: '🐉',
				message: `Resolved ${service.name} (${service.host})`
			})
			this.state.logs.push({
				emoji: '🔗',
				message: JSON.stringify(service)
			})

			this.setState({
				services: {
					...this.state.services,
					[service.host]: service,
				},
			})
		})

		zeroconf.on('error', err => {
			this.setState({ isScanning: false })
			this.state.logs.push({
				emoji: '🚨',
				message: `Error: ${err}`
			})
		})
	}

	renderRow = ({ item, index }: { item: string, index: number }) => {
		const { name, fullName, host, addresses } = this.state.services[item]

		return (
			<TouchableOpacity
				onPress={() =>
					this.setState({
						selectedService: host,
					})}
			>
				<ListItem.Content>
					<ListItem.Title>{name}</ListItem.Title>
					<ListItem.Subtitle>{fullName} / {addresses.join(',')}</ListItem.Subtitle>
				</ListItem.Content>
			</TouchableOpacity>
		)
	}

	refreshData = () => {
		const { isScanning } = this.state
		if (isScanning) {
			return
		}
		this.setState({ services: [] })

		zeroconf.scan('http', 'tcp', 'local.')
		this.state.logs.push({
			emoji: '🔍♻️',
			message: 'ReScanning for services...'
		})

		clearTimeout(this.timeout)
		this.timeout = setTimeout(() => {
			zeroconf.stop()
		}, 5000)
	} 

	showlogs = () => {
		this.setState({ selectedService: null })
		this.setState({ showLogs: true })
	}

	render() {
		const { services, selectedService, isScanning } = this.state
		console.log(selectedService)

		const service = selectedService ? services[selectedService] : null;

		if (service) {
			return (
				<SafeAreaProvider>
					<SafeAreaView style={styles.container}>
						<TouchableOpacity onPress={() => this.setState({ selectedService: null })}>
							<Text style={styles.closeButton}>{'詳細を閉じる'}</Text>
						</TouchableOpacity>
						<Text style={styles.state}>{service.host}</Text>
						<Text style={styles.state}>{service.addresses.join('\n')}</Text>
						<View style={styles.json}>
							<Text>{JSON.stringify(service, null, 2)}</Text>
						</View>
					</SafeAreaView>
				</SafeAreaProvider>
			)
		}

		if (this.state.showLogs) {
			return (
				<SafeAreaProvider>
					<SafeAreaView style={styles.container}>
						<TouchableOpacity onPress={() => this.setState({ showLogs: false })}>
							<Text style={styles.closeButton}>{'ログを閉じる'}</Text>
						</TouchableOpacity>
						<RNScrollView style={styles.logs} >
							{this.state.logs.map((log, index) => (
								<View style={ styles.flexLog }>
									<Text key={index} style={styles.logs}>{log.emoji}</Text>
									<Text key={"k"+index} style={styles.json}>{log.message}</Text>
								</View>
							))}
						</RNScrollView>
					</SafeAreaView>
				</SafeAreaProvider>
			)
		}

		return (
			<SafeAreaProvider>
				<SafeAreaView style={styles.container}>
					<Text style={styles.state}><AnimatedText text={isScanning ? "🔍" : "🚀"} />{isScanning ? ' お友達を探しています...' : ' 共有するデバイスの選択'}</Text>
					{
						isScanning ? (
							<>
								<Text style={styles.state}>付近のデバイスを検索中</Text>
							</>
						) : (
							<>
								<FlatList
									data={Object.keys(services)}
									renderItem={this.renderRow}
									keyExtractor={key => key}
									refreshControl={
										<RefreshControl
											refreshing={isScanning}
											onRefresh={this.refreshData}
											tintColor="skyblue"
										/>
									}
								/>
								<Button title="デバックログを確認する" onPress={this.showlogs} />
							</>
						)
					}
				</SafeAreaView>
			</SafeAreaProvider>
		)
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		marginLeft: 10
	},
	closeButton: {
		padding: 20,
		textAlign: 'center',
	},
	json: {
		padding: 6,
		fontWeight : "bold",
		fontSize: 15,
	},
	logs: {
		padding: 3,
		fontSize: 20,
		fontWeight: "semibold"
	},
	state: {
		fontSize: 20,
		textAlign: 'center',
		margin: 30,
	},
	flexLog : {
		display: 'flex',
		flexDirection: "row",
		alignContent : "center"
	}
})