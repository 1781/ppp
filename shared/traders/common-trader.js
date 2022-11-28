import { getInstrumentPrecision } from '../intl.js';

export class Trader {
  fixPrice(instrument, price) {
    const precision = getInstrumentPrecision(instrument);

    price = parseFloat(price?.replace(',', '.'));

    if (!price || isNaN(price)) price = 0;

    return price.toFixed(precision).toString();
  }

  async subscribeField({ source, field, datum }) {
    const [subs, refs] = this.subsAndRefs?.(datum) ?? [];

    if (subs) {
      const array = subs.get(source);

      if (Array.isArray(array)) {
        if (!array.find((e) => e.field === field)) array.push({ field, datum });
      } else {
        subs.set(source, [{ field, datum }]);
      }

      await this.addRef(source?.instrument, refs);
    }
  }

  async subscribeFields({ source, fieldDatumPairs = {} }) {
    for (const [field, datum] of Object.entries(fieldDatumPairs)) {
      await this.subscribeField({ source, field, datum });
    }
  }

  async unsubscribeField({ source, field, datum }) {
    const [subs, refs] = this.subsAndRefs?.(datum) ?? [];

    if (subs) {
      const array = subs.get(source);
      const index = array?.findIndex?.(
        (e) => e.field === field && e.datum === datum
      );

      if (index > -1) {
        array.splice(index, 1);

        if (!array.length) {
          subs.delete(source);
        }

        await this.removeRef(source?.instrument, refs);
      }
    }
  }

  async unsubscribeFields({ source, fieldDatumPairs = {} }) {
    for (const [field, datum] of Object.entries(fieldDatumPairs)) {
      await this.unsubscribeField({ source, field, datum });
    }
  }

  async addRef(instrument, refs) {
    if (instrument?._id && refs) {
      const ref = refs.get(instrument._id);

      if (typeof ref === 'undefined') {
        await this.addFirstRef?.(instrument, refs, ref);
      } else {
        ref.refCount++;
      }
    }
  }

  async removeRef(instrument, refs) {
    if (instrument?._id && refs) {
      const ref = refs.get(instrument._id);

      if (typeof ref !== 'undefined') {
        if (ref.refCount > 0) {
          ref.refCount--;
        }

        if (ref.refCount === 0) {
          await this.removeLastRef?.(instrument, refs, ref);
          refs.delete(instrument._id);
        }
      }
    }
  }

  async instrumentChanged(source, oldValue, newValue) {
    for (const key of Object.keys(this.subs)) {
      const sub = this.subs[key];

      if (sub.has(source)) {
        for (const { field } of sub.get(source)) {
          source[field] = '—';

          if (oldValue) {
            await this.removeRef(oldValue, this.refs[key]);
          }

          if (newValue) {
            await this.addRef(newValue, this.refs[key]);
          }
        }
      }
    }
  }
}
