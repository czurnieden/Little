function kroneckerdelta(i, j)
{
    if (arguments.length === 2) {
        if (i == 0) {
            return 1;
        } else {
            return 0;
        }
    }
    if (i != j) {
        return 0;
    } else {
        return 1;
    }
}
