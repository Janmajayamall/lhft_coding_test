import "./App.css";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { useEffect, useState } from "react";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles({
	table: {
		minWidth: 650,
	},
});

function App() {
	const classes = useStyles();

	const [priceTable, setPriceTable] = useState([]);
	const [listening, setListening] = useState(false);
	const [threshold, setThreshold] = useState(-1);
	const [frequency, setFrequency] = useState(-1);

	useEffect(() => {
		if (listening === true) {
			return;
		}
		const sse = new EventSource("http://127.0.0.1:80/stream");
		sse.onmessage = (e) => {
			const event = JSON.parse(e.data);
			let newPrices = [...event, ...priceTable].slice(0, 500);

			setPriceTable(newPrices);
		};
		return () => {
			sse.close();
			setListening(false);
		};
	});

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
			}}
			className="App"
		>
			<div
				style={{ display: "flex", flexDirection: "row", marginTop: 20 }}
			>
				<TextField
					id="filled-basic"
					label="Threshold"
					variant="filled"
					value={threshold}
					type="number"
					onChange={(e) => {
						setThreshold(Number(e.target.value));
					}}
					style={{ marginRight: 5 }}
				/>
				<div style={{ display: "flex", flexDirection: "column" }}>
					<TextField
						id="filled-basic"
						label="Set Frequency (in ms)"
						variant="filled"
						value={frequency}
						type="number"
						onChange={(e) => {
							setFrequency(Number(e.target.value));
						}}
					/>
					<Button
						onClick={() => {
							if (frequency <= 0) {
								return;
							}
							const requestOptions = {
								method: "POST",
								// mode: "no-cors",
								headers: {
									Accept: "application/json",
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									frequency: frequency,
								}),
								mode: "no-cors",
							};
							fetch(
								"http://localhost:80/updateFrequency",
								requestOptions
							).then((response) => console.log(response));
						}}
						style={{ marginTop: 10 }}
						variant="contained"
					>
						Set Frequency
					</Button>
				</div>
			</div>

			<TableContainer
				style={{ marginTop: 20, width: "70%" }}
				component={Paper}
			>
				<Table className={classes.table} aria-label="simple table">
					<TableHead>
						<TableRow>
							<TableCell align="center">Ticker</TableCell>
							<TableCell align="center">Price</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{priceTable.map((row, index) => (
							<TableRow key={index}>
								<TableCell align="center">
									{row.symbol}
								</TableCell>
								<TableCell
									style={{
										backgroundColor:
											threshold > 0
												? row.price > threshold
													? "green"
													: row.price < threshold
													? "red"
													: "white"
												: "white",
									}}
									align="center"
								>
									{row.price}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</div>
	);
}

export default App;
