export const shortenAddress = (addr) => `${addr.slice(0, 5)}....${addr.slice(addr.length - 3)}`;

export const parseErrorMsg = (err) => {
    const json = JSON.parse(JSON.stringify(err));
    return json.reason || json?.error?.message;
}