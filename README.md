# 異なるOS間における近距離通信及び識別方法

## ライセンスについて
このアプリケーションでは様々なOSSパッケージを用いています。各パッケージのライセンスについてはそのパッケージについてみてください。

このアプリケーションのソースコードにはMITライセンスが付与されています。難しいことはLICENCEファイルにて。

## 動かし方（動くかな？）

大体の動かし方です。エラー等が出たら別紙の引継ぎ資料を見るといいと思います。

### Androidなら

1. Gradleを入れます。たぶん私は8.7を使いました。
2. AndroidStudioも入れます。
3. Javaも入れます。
4. だいたい入ったら`npm i --save`をしてパッケージをインストールします。
5. `success!`がでたら`npm run android`を実行してみてください。

何事もなければ動きます。

### iOSなら

> [!TIP]
> iOSアプリケーションをビルドする際は**Mac**とかのアップル製PCが必要です。

1. Podをいれます。
2. XCodeもいれます。
3. XCodeとこのプロジェクトを紐づけします。
> [!IMPORTANT]
> 紐づけをしないとそもそもビルドができません。
4. `npm i --save`をしてパッケージをインストールします。
5. `success!`がでたら`npm run ios`を実行してみてください。

## 基本的なファイル構造について

私が後から付け足したりいろいろした結果悲惨な感じになっていますが、本業ではないのであしからず。

- エントリーポイント : `index.js` （基本的にはいじらなくてもいい）
- アプリの処理とか：`src`
- どこでも使うから汎用化したもの：`components`
- 型ファイル：`types`

### src
使ってるものと使ってないものがあります。消せって話ですよね。すいません。

#### 使ってる
- DetailScreen.new.tsx
- logScreen.tsx
- QRCodeScannedScreen.tsx
- ScanQRScreen.tsx
- SelectImageInitScreen.tsx
- SelectSenderScreen.tsx
- ShowComingDatas.tsx

#### つかってない（とくにかんけいない）
- HomeScreen.new.tsx
- index.ts (インポートの関係で置いてあるだけ)

#### 呼ばれ方（使われ方）
各ファイルの呼ばれ方・関係はこのようになっています。

ユーザーが操作したり、スキャンしたりするとこのように転移するといった形ですね。

`SelectImageInitScreen.tsx` 

-> `SelectSenderScreen.tsx`

-> `ScanQRScreen.tsx`

-> `ShowComingDatas.tsx`

-> `logScreen.tsx`

`SelectSenderScreen.tsx` -> `DetailScreen.new.tsx`

`ScanQRScreen.tsx` -> `QRCodeScannedScreen.tsx`

### components

汎用的な要素、クラスなど。

#### autosizedImage.tsx

[この記事の物を](https://zenn.dev/toshiyuki/articles/4791ccada2ba7e)参考にしました。ありがとうございます。

#### calcuateEstimate.ts

予想時間を計算するやつ。

#### context.tsx

> [!TIP]
> ここでの状態とはstateの事です。
> useState()とかのアレよアレ

コンテキスト。このアプリ全体の**状態**を管理するのがContextです。

普通の**状態**はページを跨いだりすると無くなってしまうのですが、Contextはページをまたいだりしても**状態**を保存してくれます。

いい子だね。

#### getFileTypeFromBuffer.ts

バッファの先端16bitからファイル種別を抜き取るやつ

#### index.ts

インポートのために必要な奴

#### shardSender.ts

シャードセンダー。その名の通り、ファイルを分割して送るために必要なファイル。

この通信を実装するべきところでは、このファイルを**継承**するだけで分割送信ができるようになります。

あ、もちろん送るファイルの設定とか送る関数の実行とかはしなくちゃいけませんよ？

ただ送る関数の実装は**継承**がすべてやってくれるとそういうことです。

### types

型ファイル

#### index.ts

インポートの！！エントリーポイント！

#### rootParamList.ts

このアプリの画面一覧みたいな、そういうイメージ

### App.tsx

このアプリのマジで中心というか、ベースのベース。

ここでHTTPサーバーとかmDNSサーバーが動いてるし、このクラス自体も`ShardSender`を継承していたりと、何とも自由。

## 通信プロトコル（？）について

複雑に見えて割と単純な送信プロトコルですよ。ついてきてくださいね。

### さぁ相手に送りましょう

相手に送る際は、相手の端末にこのようなJSONデータを送ります。

> [!WARNING]
> headerのContent-Typeは必ず"application/json"を指定してください。痛い目にあいます。
> （iOSのHTTPサーバー君がこのデータを空データだと誤認する）

`POST /stream`
```ts
{
    "from": "base64base64base64"
    "status" : "SHARD_POSTING"
    "uri": "binarybinarybinarybinarybinarybinary"
    "totalShards": integer
    "shardIndex": integer
    "imgType": "MINE_TYPE"
    "totalImageIndex": integer
    "uniqueId": "UNIQUESENDIDIDIDID"
    "index": integer
    "name" : "FILE_NAME"
}
```

#### from
誰から送られたものなのかが入ったJSONデータです。`base64`形式にエンコードされているため、使用する際はデコードして`JSON.parse`にでも突っ込んでください。

```json
{
    "id" : "DeviceId",
    "name": "DeviceName",
    "model": "PlatformOS"
}
```

こんな感じのデータになれば成功してます。

#### status 
"SHARD_POSTING" 固定です。シャード送ってるよっていう指標ですね。

#### uri
シャードのデータです。0と1のバイナリに変換されてます。

#### totalShards
このシャードが合計で何個あるのかを相手に教えます。

### shardIndex
このシャードは何番目のシャードであるかのデータです。

これをもとに並び替えることで、写真として復元できます。

### imgType
Content-Typeです。MineTypeが入っています。

拡張子復元のためですね。

### totalImageIndex
全部で送った写真・データ自体は何枚なのかを表します。

### uniqueId
この送信セッション自体のユニークなIDです。

### index
シャード自体のindexです。これで並び替えてもデータは復元できないので注意。

### name
この写真・データの名前。

### 相手からQR経由で写真をもらうとき

QR経由の時は、こんなかんじ

1. 相手が生きているかを確かめる

`POST /info`

還ってきたらおK

2. 相手に要求する

相手に写真を要求しましょう。以下のJSONデータも一緒に。

`PUT /stream`
```json
{
    "ip": "YOUR PHONE IP"
}
```

このあなたが送ったIPをもとに相手は写真を送ってくれます。

送る際はさっきと同じ方法でシャード化して送ってくれます。優しい。

## その他不明な点があったら・・・

AIに聞いてみる？